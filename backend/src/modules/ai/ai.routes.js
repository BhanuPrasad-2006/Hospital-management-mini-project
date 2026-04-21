/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — AI Module — Routes                            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * POST /api/ai/prescription-scan   Doctor | Nurse | PATIENT (own only)
 * POST /api/ai/diagnosis-assist    Doctor only
 * POST /api/ai/triage              Doctor | Nurse
 * GET  /api/ai/health              Public — liveness probe
 */

"use strict";

const { Router } = require("express");
const multer     = require("multer");
const path       = require("path");
const crypto     = require("crypto");
const fs         = require("fs");

const {
  processPrescription,
  diagnosisAssist,
  triage,
  aiHealthCheck,
} = require("./ai.controller");

const { authenticate }           = require("../../middleware/auth");
const { authorize }              = require("../../middleware/rbac");
const { sensitiveLimiter }       = require("../../middleware/ratelimit");
const { handleUploadError }      = require("../../middleware/upload");

const router = Router();

// ─── Multer — disk storage for prescription images ────────────────────────────
// We use diskStorage (not memoryStorage) so multer writes the file to a tmp
// directory; the controller reads it as a stream when uploading to S3, then
// deletes the local file.

const UPLOAD_TMP = path.join(__dirname, "../../../uploads/tmp");
if (!fs.existsSync(UPLOAD_TMP)) fs.mkdirSync(UPLOAD_TMP, { recursive: true });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_MB  = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10;

const prescriptionUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_TMP),
    filename:    (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only images (jpg/png/webp) and PDFs are accepted. Got: ${file.mimetype}`));
    }
  },
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public liveness probe (no auth)
router.get("/health", aiHealthCheck);

// Prescription scan — patients can scan their own; clinical staff can scan for any patient
router.post(
  "/prescription-scan",
  authenticate,
  authorize("PATIENT", "DOCTOR", "NURSE", "PHARMACIST"),
  sensitiveLimiter,                               // 5 req/hr — OCR is expensive
  prescriptionUpload.single("file"),
  handleUploadError,
  processPrescription
);

// Diagnosis assist — doctors only
router.post(
  "/diagnosis-assist",
  authenticate,
  authorize("DOCTOR"),
  diagnosisAssist
);

// Triage
router.post(
  "/triage",
  authenticate,
  authorize("DOCTOR", "NURSE"),
  triage
);

module.exports = router;
