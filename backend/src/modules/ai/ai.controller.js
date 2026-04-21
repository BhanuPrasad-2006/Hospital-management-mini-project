/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — AI Controller                                 ║
 * ║  Prescription Scan Pipeline:                                    ║
 * ║    1. Receive image → upload to AWS S3                          ║
 * ║    2. Send S3 URL → FastAPI /process-prescription               ║
 * ║    3. Translate AI summary → Bhashini (patient's language)      ║
 * ║    4. Persist Prescription + DietPlan → Prisma                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Routes (see ai.routes.js):
 *   POST /api/ai/prescription-scan   — main pipeline (Doctor / Nurse / Patient)
 *   POST /api/ai/diagnosis-assist    — symptom → differential diagnosis
 *   POST /api/ai/triage              — chief complaint → triage priority
 *   GET  /api/ai/health              — liveness check for FastAPI service
 */

"use strict";

const axios  = require("axios");
const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const prisma                  = require("../../config/db");
const { getS3Client, BUCKET } = require("../../config/s3");
const { translateWithBhashini } = require("../../config/bhashini");
const { writeAuditLog }         = require("../../security/audit");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AWS_REGION     = process.env.AWS_REGION     || "ap-south-1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _ok(res, data, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}
function _err(res, status, message) {
  return res.status(status).json({ success: false, message });
}

/**
 * Upload a local file (written by multer) to S3.
 * Returns the public-read HTTPS URL.
 *
 * @param {object} file - multer file object
 * @param {string} folder - S3 key prefix, e.g. "prescriptions"
 * @returns {Promise<{ s3Key: string, s3Url: string }>}
 */
async function _uploadToS3(file, folder = "prescriptions") {
  const s3   = getS3Client();
  const ext  = path.extname(file.originalname).toLowerCase();
  const key  = `${folder}/${crypto.randomUUID()}${ext}`;

  const fileStream = fs.createReadStream(file.path);

  await s3.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        fileStream,
      ContentType: file.mimetype,
      // No ACL — access via pre-signed URL or CloudFront
    })
  );

  // Cleanup local temp file written by multer diskStorage
  fs.unlink(file.path, () => {});

  const s3Url = `https://${BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  return { s3Key: key, s3Url };
}

/**
 * Delete an S3 object (used on pipeline failure to avoid orphaned files).
 */
async function _deleteFromS3(key) {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
    );
  } catch (err) {
    console.error("[ai] S3 cleanup failed for key=%s: %s", key, err.message);
  }
}

/**
 * Call the FastAPI microservice.
 * @param {string} endpoint - e.g. "/process-prescription"
 * @param {object} payload
 * @param {number} [timeout=30000]
 * @returns {Promise<object>} parsed JSON response
 */
async function _callFastAPI(endpoint, payload, timeout = 30_000) {
  const response = await axios.post(
    `${AI_SERVICE_URL}${endpoint}`,
    payload,
    {
      headers:  { "Content-Type": "application/json" },
      timeout,
    }
  );
  return response.data;
}

// ─── 1. Prescription Scan Pipeline ───────────────────────────────────────────

/**
 * POST /api/ai/prescription-scan
 *
 * Request:
 *   multipart/form-data
 *     file       — prescription image (jpg/png/webp/pdf)
 *     patientId  — UUID of the patient this prescription belongs to
 *     doctorId   — UUID of the prescribing doctor
 *     language   — target language code for Bhashini (default: "en")
 *
 * Pipeline:
 *   [multer] → S3 upload → FastAPI OCR+AI → Bhashini translate → Prisma save
 *
 * Returns: full Prescription record with nested PrescriptionMedicine[] and DietPlan
 */
async function processPrescription(req, res) {
  const file = req.file;
  if (!file) {
    return _err(res, 400, "No prescription image uploaded. Send file as multipart/form-data.");
  }

  const { patientId, doctorId } = req.body;
  if (!patientId || !doctorId) {
    fs.unlink(file.path, () => {});
    return _err(res, 422, "patientId and doctorId are required fields.");
  }

  // Row-Level Security: patients may only submit scans for themselves
  if (req.user.role === "PATIENT" && req.user.id !== patientId) {
    fs.unlink(file.path, () => {});
    return _err(res, 403, "Patients may only submit prescriptions for their own account.");
  }

  let s3Key = null;

  try {

    // ── Step 1: Upload to AWS S3 ─────────────────────────────────────────────

    const { s3Key: key, s3Url } = await _uploadToS3(file, "prescriptions");
    s3Key = key;

    // ── Step 2: Send to FastAPI for OCR + AI structuring ────────────────────

    let aiResult;
    try {
      aiResult = await _callFastAPI(
        "/process-prescription",
        {
          image_url:  s3Url,
          patient_id: patientId,
          doctor_id:  doctorId,
          language:   req.body.language || "en",
        },
        45_000  // 45s — OCR can be slow
      );
    } catch (aiErr) {
      // Clean up S3 on AI failure
      await _deleteFromS3(s3Key);
      if (aiErr.code === "ECONNREFUSED") {
        return _err(res, 503, "AI service is offline. Please try again later.");
      }
      if (aiErr.response?.status === 422) {
        return _err(res, 422, "AI could not parse the prescription image. Please upload a clearer photo.");
      }
      throw aiErr;
    }

    /*
     * Expected FastAPI response shape:
     * {
     *   success:   true,
     *   raw_text:  "...",            // OCR output
     *   diagnosis: "Type 2 Diabetes",
     *   icd_code:  "E11",
     *   notes:     "Take with food",
     *   expires_in_days: 30,
     *   medicines: [
     *     { name, generic_name, dose, frequency, timing, duration_days, purpose, side_effects, quantity }
     *   ],
     *   diet_plan: {
     *     foods_to_eat:   [],
     *     foods_to_avoid: [],
     *     meal_timing:    { breakfast, lunch, dinner },
     *     hydration:      "...",
     *     special_notes:  "..."
     *   }
     * }
     */

    if (!aiResult?.success) {
      await _deleteFromS3(s3Key);
      return _err(res, 422, aiResult?.message || "AI prescription parsing failed.");
    }

    // ── Step 3: Translate summary via Bhashini ───────────────────────────────

    const targetLang = req.body.language || "en";

    // Translate fields that will be shown to the patient
    const [
      diagnosisTranslated,
      notesTranslated,
      dietSpecialNotesTranslated,
    ] = await Promise.all([
      translateWithBhashini(aiResult.diagnosis   || "", targetLang),
      translateWithBhashini(aiResult.notes       || "", targetLang),
      translateWithBhashini(aiResult.diet_plan?.special_notes || "", targetLang),
    ]);

    // Translate each medicine purpose individually
    const translatedMedicines = await Promise.all(
      (aiResult.medicines || []).map(async (med) => ({
        ...med,
        purpose: await translateWithBhashini(med.purpose || "", targetLang),
      }))
    );

    // Translate diet food lists (join → translate → split is more efficient than per-item)
    const foodsEatStr   = (aiResult.diet_plan?.foods_to_eat   || []).join(", ");
    const foodsAvoidStr = (aiResult.diet_plan?.foods_to_avoid || []).join(", ");

    const [foodsEatTr, foodsAvoidTr] = await Promise.all([
      translateWithBhashini(foodsEatStr,   targetLang),
      translateWithBhashini(foodsAvoidStr, targetLang),
    ]);

    // ── Step 4: Persist to Prisma — Prescription + DietPlan ─────────────────

    const expiresAt = new Date(
      Date.now() + (aiResult.expires_in_days || 30) * 86_400_000
    );

    const prescription = await prisma.$transaction(async (tx) => {

      // 4a. Create Prescription with nested PrescriptionMedicine rows
      const rx = await tx.prescription.create({
        data: {
          patientId,
          doctorId,
          imageUrl:   s3Url,
          rawOcrText: aiResult.raw_text || null,
          isAiScanned: true,
          diagnosis:  diagnosisTranslated  || null,
          icdCode:    aiResult.icd_code    || null,
          notes:      notesTranslated      || null,
          language:   targetLang,
          expiresAt,

          medicines: {
            create: translatedMedicines.map((med) => ({
              medicineName:  med.name         || "Unknown",
              genericName:   med.generic_name || null,
              dose:          med.dose         || "",
              frequency:     med.frequency    || "",
              timing:        med.timing       || "As directed",
              durationDays:  med.duration_days || 7,
              purpose:       med.purpose      || null,
              sideEffects:   med.side_effects || [],
              quantity:      med.quantity     || null,
            })),
          },
        },
        include: {
          medicines: true,
        },
      });

      // 4b. Create DietPlan (only if AI returned one)
      let dietPlan = null;
      if (aiResult.diet_plan) {
        const dp = aiResult.diet_plan;
        dietPlan = await tx.dietPlan.create({
          data: {
            prescriptionId: rx.id,
            patientId,
            foodsToEat:   foodsEatTr   ? foodsEatTr.split(",").map(s => s.trim()).filter(Boolean) : [],
            foodsToAvoid: foodsAvoidTr ? foodsAvoidTr.split(",").map(s => s.trim()).filter(Boolean) : [],
            mealTiming: {
              breakfast: dp.meal_timing?.breakfast || null,
              lunch:     dp.meal_timing?.lunch     || null,
              dinner:    dp.meal_timing?.dinner    || null,
            },
            hydration:     dp.hydration           || null,
            specialNotes:  dietSpecialNotesTranslated || null,
            generatedByAi: true,
            language:      targetLang,
          },
        });
      }

      return { ...rx, dietPlan };
    }); // end $transaction

    // ── Step 5: Audit log ────────────────────────────────────────────────────

    await writeAuditLog({
      entityType: req.user.entityType,
      entityId:   req.user.id,
      action:     "UPLOAD",
      resource:   "Prescription",
      resourceId: prescription.id,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    {
        patientId,
        doctorId,
        s3Key,
        language:    targetLang,
        medicineCount: prescription.medicines?.length ?? 0,
        hasDietPlan: !!prescription.dietPlan,
      },
    });

    return _ok(
      res,
      {
        prescription,
        pipeline: {
          s3Url,
          aiProcessed:   true,
          translated:    targetLang !== "en",
          targetLanguage: targetLang,
        },
      },
      "Prescription scanned and saved successfully.",
      201
    );

  } catch (err) {
    // Rollback S3 upload on unexpected error
    if (s3Key) await _deleteFromS3(s3Key);
    console.error("[ai] processPrescription pipeline error:", err);
    return _err(res, 500, "Prescription processing failed. Please try again.");
  }
}

// ─── 2. Diagnosis Assist ──────────────────────────────────────────────────────

/**
 * POST /api/ai/diagnosis-assist  (Doctor only)
 *
 * Body: { symptoms: string[], patientAge: number, patientGender: string, medicalHistory?: string[] }
 * Calls FastAPI /api/diagnosis-assist, returns possible diagnoses.
 */
async function diagnosisAssist(req, res) {
  const { symptoms, patientAge, patientGender, medicalHistory = [] } = req.body;

  if (!symptoms?.length) {
    return _err(res, 422, "At least one symptom is required.");
  }

  try {
    const aiResult = await _callFastAPI("/api/diagnosis-assist", {
      symptoms,
      patient_age:    patientAge,
      patient_gender: patientGender,
      medical_history: medicalHistory,
    });

    await writeAuditLog({
      entityType: req.user.entityType,
      entityId:   req.user.id,
      action:     "READ",
      resource:   "AI_Diagnosis",
      ipAddress:  req.ip,
      details:    { symptoms, patientAge },
    });

    return _ok(res, aiResult);
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return _err(res, 503, "AI service is offline.");
    }
    console.error("[ai] diagnosisAssist:", err);
    return _err(res, 500, "Diagnosis assist failed.");
  }
}

// ─── 3. Triage ────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/triage  (Doctor / Nurse)
 *
 * Body: { chiefComplaint: string, vitalSigns?: object, painLevel?: number, consciousness?: string }
 */
async function triage(req, res) {
  const { chiefComplaint, vitalSigns = {}, painLevel = 0, consciousness = "alert" } = req.body;

  if (!chiefComplaint) {
    return _err(res, 422, "chiefComplaint is required.");
  }

  try {
    const aiResult = await _callFastAPI("/api/triage", {
      chief_complaint: chiefComplaint,
      vital_signs:     vitalSigns,
      pain_level:      painLevel,
      consciousness,
    });

    return _ok(res, aiResult);
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return _err(res, 503, "AI service is offline.");
    }
    console.error("[ai] triage:", err);
    return _err(res, 500, "Triage failed.");
  }
}

// ─── 4. AI Service Health Check ───────────────────────────────────────────────

/**
 * GET /api/ai/health  (public)
 */
async function aiHealthCheck(req, res) {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5_000 });
    return res.json({ success: true, aiService: data });
  } catch {
    return res.json({
      success: false,
      aiService: { status: "offline" },
      message: "AI service is not reachable.",
    });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  processPrescription,
  diagnosisAssist,
  triage,
  aiHealthCheck,
};
