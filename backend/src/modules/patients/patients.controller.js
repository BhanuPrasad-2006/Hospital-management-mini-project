/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Patient Controller                            ║
 * ║  Row-Level Security: all queries scoped to req.user.id          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Endpoints:
 *   POST   /api/patients/register          → registerPatient
 *   GET    /api/patients/me                → getMyProfile
 *   PUT    /api/patients/me                → updateMyProfile
 *   POST   /api/patients/appointments      → bookAppointment  ← Tx + conflict check
 *   GET    /api/patients/appointments      → getMyAppointments
 *   DELETE /api/patients/appointments/:id  → cancelAppointment
 *   GET    /api/patients/prescriptions     → viewPrescriptions
 *   GET    /api/patients/lab-reports       → getLabReports
 */

"use strict";

const bcrypt  = require("bcryptjs");
const prisma  = require("../../config/db");

const { generatePatientId }          = require("./patient.id");
const { writeAuditLog }              = require("../../security/audit");
const { encryptPII, decryptPII,
        encryptJSON, decryptJSON,
        encryptFields, decryptFields,
        PATIENT_PII_FIELDS,
        PATIENT_PII_JSON_FIELDS }    = require("../../security/encrypt");
const { generateAccessToken,
        generateRefreshToken }       = require("../../middleware/auth");

const SALT_ROUNDS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decrypt all PII fields on a patient record before sending to client.
 */
function _decryptPatient(p) {
  return decryptFields(p, PATIENT_PII_FIELDS, PATIENT_PII_JSON_FIELDS);
}

/**
 * Build the RLS where clause — patients can only see their own data.
 * @param {string} patientId - UUID from req.user.id
 */
function _ownedBy(patientId) {
  return { patientId, isDeleted: false };
}

function _ok(res, data, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function _err(res, status, message) {
  return res.status(status).json({ success: false, message });
}

// ─── 1. Register Patient ──────────────────────────────────────────────────────

/**
 * POST /api/patients/register  (public)
 *
 * Creates a Patient record with:
 *   - PAT-YYYY-XXXX ID (generated inside a transaction)
 *   - AES-256-CBC encrypted PII fields
 *   - Returns access + refresh token pair
 */
async function registerPatient(req, res) {
  const body = req.validatedBody;

  try {
    // Check phone uniqueness — decrypt is expensive so we check via a
    // query on encrypted value (same key → same plaintext → same ciphertext
    // only if we used deterministic encryption; since we use random IV we
    // cannot do a simple WHERE. Instead we enforce at application level:
    // fetch and compare decrypted phone in a paginated scan — not scalable
    // for large DBs.  Production fix: store a HMAC of phone for uniqueness index.
    // For now we rely on the UNIQUE constraint on patientId/email/abhaId.

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const patient = await prisma.$transaction(async (tx) => {
      const patientId = await generatePatientId(tx);

      return tx.patient.create({
        data: {
          patientId,
          ...encryptFields(
            {
              firstName:         body.firstName,
              lastName:          body.lastName,
              phone:             body.phone,
              email:             body.email   ?? null,
              address:           body.address ?? null,
              emergencyContact:  body.emergencyContact ?? null,
            },
            PATIENT_PII_FIELDS,
            PATIENT_PII_JSON_FIELDS
          ),
          passwordHash,
          dateOfBirth:       new Date(body.dateOfBirth),
          gender:            body.gender,
          bloodGroup:        body.bloodGroup        ?? null,
          abhaId:            body.abhaId            ?? null,
          allergies:         body.allergies          ?? [],
          chronicConditions: body.chronicConditions  ?? [],
          // Create default settings in same transaction
          settings: {
            create: {
              preferredLanguage: "en",
            },
          },
        },
        include: { settings: true },
      });
    });

    // Audit
    await writeAuditLog({
      entityType: "PATIENT",
      entityId:   patient.id,
      action:     "CREATE",
      resource:   "Patient",
      resourceId: patient.id,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    { patientId: patient.patientId },
    });

    // Issue tokens
    const accessToken  = generateAccessToken(patient, "PATIENT");
    const refreshToken = await generateRefreshToken(patient, "PATIENT", {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return _ok(
      res,
      {
        accessToken,
        refreshToken,
        patient: {
          id:        patient.id,
          patientId: patient.patientId,
          firstName: body.firstName,   // return plaintext from input — avoids decrypt round-trip
          lastName:  body.lastName,
        },
      },
      "Registration successful.",
      201
    );
  } catch (err) {
    if (err.code === "P2002") {
      return _err(res, 409, "A patient with this ABHA ID already exists.");
    }
    console.error("[patient] registerPatient:", err);
    return _err(res, 500, "Registration failed.");
  }
}

// ─── 2. Get My Profile ────────────────────────────────────────────────────────

/**
 * GET /api/patients/me  (authenticated — PATIENT only)
 * Row-Level Security: only the calling patient's record.
 */
async function getMyProfile(req, res) {
  try {
    const patient = await prisma.patient.findUnique({
      where:   { id: req.user.id, isDeleted: false },
      include: { settings: true, verification: { select: { status: true, isVerified: true } } },
    });

    if (!patient) return _err(res, 404, "Patient profile not found.");

    return _ok(res, _decryptPatient(patient));
  } catch (err) {
    console.error("[patient] getMyProfile:", err);
    return _err(res, 500, "Failed to fetch profile.");
  }
}

// ─── 3. Update My Profile ─────────────────────────────────────────────────────

/**
 * PUT /api/patients/me  (authenticated — PATIENT only)
 */
async function updateMyProfile(req, res) {
  const body = req.validatedBody;

  try {
    const updateData = encryptFields(
      {
        ...(body.phone             && { phone:            body.phone }),
        ...(body.email             && { email:            body.email }),
        ...(body.address           && { address:          body.address }),
        ...(body.emergencyContact  && { emergencyContact: body.emergencyContact }),
        ...(body.bloodGroup        && { bloodGroup:       body.bloodGroup }),
        ...(body.allergies         && { allergies:        body.allergies }),
        ...(body.chronicConditions && { chronicConditions: body.chronicConditions }),
        ...(body.profilePhotoUrl   && { profilePhotoUrl:  body.profilePhotoUrl }),
      },
      PATIENT_PII_FIELDS,
      PATIENT_PII_JSON_FIELDS
    );

    const updated = await prisma.patient.update({
      where: { id: req.user.id, isDeleted: false },
      data:  updateData,
    });

    await writeAuditLog({
      entityType: "PATIENT",
      entityId:   req.user.id,
      action:     "UPDATE",
      resource:   "Patient",
      resourceId: req.user.id,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    { updatedFields: Object.keys(updateData) },
    });

    return _ok(res, _decryptPatient(updated), "Profile updated.");
  } catch (err) {
    console.error("[patient] updateMyProfile:", err);
    return _err(res, 500, "Failed to update profile.");
  }
}

// ─── 4. Book Appointment ──────────────────────────────────────────────────────

/**
 * POST /api/patients/appointments  (authenticated — PATIENT only)
 *
 * Zero-Trust booking logic inside a Prisma $transaction:
 *   Step 1 — Verify doctor exists, is active, and available on that day/time.
 *   Step 2 — Lock-check: query for overlapping CONFIRMED/IN_PROGRESS slots.
 *   Step 3 — Atomically create the appointment record.
 *   Step 4 — Write audit log.
 */
async function bookAppointment(req, res) {
  const body = req.validatedBody;

  try {
    const scheduledAt = new Date(body.scheduledAt);
    const dayOfWeek   = scheduledAt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const slotHour    = scheduledAt.toTimeString().slice(0, 5); // "HH:MM"

    const appointment = await prisma.$transaction(async (tx) => {

      // ── Step 1: Doctor availability ──────────────────────────────────────────

      const doctor = await tx.doctor.findUnique({
        where:  { id: body.doctorId },
        select: {
          id:            true,
          isActive:      true,
          isDeleted:     true,
          availableDays: true,
          availableFrom: true,
          availableTo:   true,
          leaves:        {
            where: {
              startDate: { lte: scheduledAt },
              endDate:   { gte: scheduledAt },
              approved:  true,
            },
            select: { id: true },
          },
        },
      });

      if (!doctor || !doctor.isActive || doctor.isDeleted) {
        const e = new Error("Doctor not found or inactive."); e.status = 404; throw e;
      }

      // Check working day
      if (doctor.availableDays.length > 0 && !doctor.availableDays.includes(dayOfWeek)) {
        const e = new Error(`Doctor is not available on ${dayOfWeek}.`); e.status = 409; throw e;
      }

      // Check working hours
      if (doctor.availableFrom && doctor.availableTo) {
        if (slotHour < doctor.availableFrom || slotHour >= doctor.availableTo) {
          const e = new Error(
            `Doctor is available only between ${doctor.availableFrom} and ${doctor.availableTo}.`
          );
          e.status = 409; throw e;
        }
      }

      // Check leave
      if (doctor.leaves.length > 0) {
        const e = new Error("Doctor is on leave at the requested time."); e.status = 409; throw e;
      }

      // ── Step 2: Double-booking check (30-min slot window) ───────────────────

      const slotStart = new Date(scheduledAt.getTime() - 15 * 60_000); // -15 min
      const slotEnd   = new Date(scheduledAt.getTime() + 30 * 60_000); // +30 min

      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId:    body.doctorId,
          isDeleted:   false,
          status:      { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          scheduledAt: { gte: slotStart, lte: slotEnd },
        },
        select: { id: true, scheduledAt: true },
      });

      if (conflict) {
        const e = new Error(
          `Doctor already has an appointment at ${conflict.scheduledAt.toLocaleTimeString("en-IN")}. ` +
          "Please choose a different time."
        );
        e.status = 409; throw e;
      }

      // ── Step 3: Create appointment ───────────────────────────────────────────

      return tx.appointment.create({
        data: {
          patientId:   req.user.id,  // RLS — always the calling patient
          doctorId:    body.doctorId,
          scheduledAt,
          type:        body.type      ?? "SCHEDULED",
          reason:      body.reason    ?? null,
          followUpOf:  body.followUpOf ?? null,
          status:      "PENDING",
        },
        include: {
          doctor: {
            select: { firstName: true, lastName: true, specialization: true },
          },
        },
      });
    }); // end $transaction

    // ── Step 4: Audit ────────────────────────────────────────────────────────

    await writeAuditLog({
      entityType: "PATIENT",
      entityId:   req.user.id,
      action:     "CREATE",
      resource:   "Appointment",
      resourceId: appointment.id,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    {
        doctorId:    body.doctorId,
        scheduledAt: body.scheduledAt,
        type:        body.type,
      },
    });

    return _ok(res, appointment, "Appointment booked successfully.", 201);

  } catch (err) {
    if (err.status) return _err(res, err.status, err.message);
    console.error("[patient] bookAppointment:", err);
    return _err(res, 500, "Failed to book appointment.");
  }
}

// ─── 5. Get My Appointments ───────────────────────────────────────────────────

/**
 * GET /api/patients/appointments  (authenticated — PATIENT only)
 * RLS: patientId === req.user.id enforced in where clause.
 */
async function getMyAppointments(req, res) {
  try {
    const { page, limit, status, upcoming } = req.validatedQuery;
    const skip = (page - 1) * limit;

    const where = {
      ..._ownedBy(req.user.id),
      ...(status   && { status }),
      ...(upcoming && { scheduledAt: { gte: new Date() } }),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { scheduledAt: "asc" },
        include: {
          doctor: {
            select: {
              firstName:      true,
              lastName:       true,
              specialization: true,
              profilePhotoUrl: true,
              consultationFee: true,
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return _ok(res, {
      appointments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[patient] getMyAppointments:", err);
    return _err(res, 500, "Failed to fetch appointments.");
  }
}

// ─── 6. Cancel Appointment ────────────────────────────────────────────────────

/**
 * DELETE /api/patients/appointments/:id  (authenticated — PATIENT only)
 * RLS: verifies patientId === req.user.id before allowing cancellation.
 */
async function cancelAppointment(req, res) {
  const { id } = req.params;

  try {
    // RLS check — find appointment owned by this patient
    const appt = await prisma.appointment.findFirst({
      where: { id, patientId: req.user.id, isDeleted: false },
      select: { id: true, status: true, scheduledAt: true },
    });

    if (!appt) return _err(res, 404, "Appointment not found.");

    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appt.status)) {
      return _err(res, 409, `Cannot cancel an appointment with status: ${appt.status}.`);
    }

    // Prevent cancellation < 1 hour before appointment
    const hoursUntil = (appt.scheduledAt - Date.now()) / 3_600_000;
    if (hoursUntil < 1) {
      return _err(res, 409, "Appointments cannot be cancelled less than 1 hour before the scheduled time.");
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data:  { status: "CANCELLED" },
    });

    await writeAuditLog({
      entityType: "PATIENT",
      entityId:   req.user.id,
      action:     "UPDATE",
      resource:   "Appointment",
      resourceId: id,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    { previousStatus: appt.status, newStatus: "CANCELLED" },
    });

    return _ok(res, updated, "Appointment cancelled.");
  } catch (err) {
    console.error("[patient] cancelAppointment:", err);
    return _err(res, 500, "Failed to cancel appointment.");
  }
}

// ─── 7. View Prescriptions ────────────────────────────────────────────────────

/**
 * GET /api/patients/prescriptions  (authenticated — PATIENT only)
 * RLS: patientId === req.user.id enforced in where clause.
 *
 * Audit: READ actions on prescriptions are always logged.
 */
async function viewPrescriptions(req, res) {
  try {
    const { page, limit } = req.validatedQuery;
    const skip = (page - 1) * limit;

    const where = { ..._ownedBy(req.user.id) };

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
        include: {
          medicines: true,
          dietPlan:  true,
          doctor: {
            select: {
              firstName:       true,
              lastName:        true,
              specialization:  true,
              profilePhotoUrl: true,
            },
          },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    // Audit READ
    await writeAuditLog({
      entityType: "PATIENT",
      entityId:   req.user.id,
      action:     "READ",
      resource:   "Prescription",
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    { count: prescriptions.length, page },
    });

    return _ok(res, {
      prescriptions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[patient] viewPrescriptions:", err);
    return _err(res, 500, "Failed to fetch prescriptions.");
  }
}

// ─── 8. Get Lab Reports ───────────────────────────────────────────────────────

/**
 * GET /api/patients/lab-reports  (authenticated — PATIENT only)
 * RLS: patientId === req.user.id enforced in where clause.
 *
 * Audit: READ actions on lab reports are always logged.
 */
async function getLabReports(req, res) {
  try {
    const { page, limit, status, testName } = req.validatedQuery;
    const skip = (page - 1) * limit;

    const where = {
      patientId: req.user.id,   // RLS
      isDeleted: false,
      ...(status   && { status }),
      ...(testName && { testName: { contains: testName, mode: "insensitive" } }),
    };

    const [reports, total] = await Promise.all([
      prisma.labReport.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { testDate: "desc" },
        select: {
          id:        true,
          testName:  true,
          testDate:  true,
          status:    true,
          reportUrl: true,
          results:   true,
          aiSummary: true,
          notes:     true,
          createdAt: true,
        },
      }),
      prisma.labReport.count({ where }),
    ]);

    // Audit READ
    await writeAuditLog({
      entityType: "PATIENT",
      entityId:   req.user.id,
      action:     "READ",
      resource:   "LabReport",
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    { count: reports.length, page, status, testName },
    });

    return _ok(res, {
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[patient] getLabReports:", err);
    return _err(res, 500, "Failed to fetch lab reports.");
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  registerPatient,
  getMyProfile,
  updateMyProfile,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  viewPrescriptions,
  getLabReports,
};
