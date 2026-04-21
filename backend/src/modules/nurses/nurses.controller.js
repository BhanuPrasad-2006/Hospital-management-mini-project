"use strict";

const prisma = require("../../config/db");
const { writeAuditLog } = require("../../security/audit");
const { decryptFields, PATIENT_PII_FIELDS } = require("../../security/encrypt");

const _ok  = (res, data, msg = "Success", s = 200) => res.status(s).json({ success: true, message: msg, data });
const _err = (res, s, msg) => res.status(s).json({ success: false, message: msg });
const _decPat = (p) => decryptFields(p, PATIENT_PII_FIELDS, ["emergencyContact"]);

// ── POST /api/nurse/vitals ───────────────────────────────────────────────────
async function recordVitals(req, res) {
  const {
    patientId, admissionId, bedId,
    heartRate, bloodPressure, spO2, temperature,
    bloodSugar, respiratoryRate, weight, height,
    source = "MANUAL", notes,
  } = req.body;

  if (!patientId) return _err(res, 422, "patientId is required.");

  try {
    // Verify patient exists
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, isDeleted: false }, select: { id: true },
    });
    if (!patient) return _err(res, 404, "Patient not found.");

    const reading = await prisma.vitalsReading.create({
      data: {
        patientId,
        admissionId:    admissionId    || null,
        bedId:          bedId          || null,
        heartRate:      heartRate      ?? null,
        bloodPressure:  bloodPressure  || null,
        spO2:           spO2           ?? null,
        temperature:    temperature    ?? null,
        bloodSugar:     bloodSugar     ?? null,
        respiratoryRate: respiratoryRate ?? null,
        weight:         weight         ?? null,
        height:         height         ?? null,
        source,
        recordedBy:     req.user.id,
        notes:          notes          || null,
      },
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "CREATE", resource: "VitalsReading", resourceId: reading.id,
      ipAddress: req.ip, details: { patientId, heartRate, spO2, temperature },
    });

    return _ok(res, reading, "Vitals recorded.", 201);
  } catch (err) {
    console.error("[nurse] recordVitals:", err);
    return _err(res, 500, "Failed to record vitals.");
  }
}

// ── PUT /api/nurse/medications/:id ───────────────────────────────────────────
// Mark a PrescriptionMedicine as Given/Pending/Missed
// Uses the PrescriptionMedicine importantNote field to log administration status
async function updateMedicationStatus(req, res) {
  const { id }      = req.params;
  const { status, administeredAt } = req.body;
  const allowed = ["Given", "Pending", "Missed"];

  if (!allowed.includes(status)) {
    return _err(res, 422, `status must be one of: ${allowed.join(", ")}`);
  }

  try {
    const med = await prisma.prescriptionMedicine.findUnique({
      where: { id }, select: { id: true, importantNote: true },
    });
    if (!med) return _err(res, 404, "Medication record not found.");

    const timestamp = administeredAt ? new Date(administeredAt) : new Date();
    const noteEntry = `[${timestamp.toISOString()}] Status: ${status} — Nurse: ${req.user.id}`;

    const updated = await prisma.prescriptionMedicine.update({
      where: { id },
      data:  { importantNote: noteEntry },
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "UPDATE", resource: "PrescriptionMedicine", resourceId: id,
      ipAddress: req.ip, details: { status, administeredAt: timestamp },
    });

    return _ok(res, updated, `Medication marked as ${status}.`);
  } catch (err) {
    console.error("[nurse] updateMedicationStatus:", err);
    return _err(res, 500, "Failed to update medication status.");
  }
}

// ── POST /api/nurse/notes/:patientId ─────────────────────────────────────────
// Add a timestamped nursing observation to PatientHistory
async function addNursingNote(req, res) {
  const { patientId } = req.params;
  const { note, visitDate } = req.body;

  if (!note) return _err(res, 422, "note content is required.");

  try {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, isDeleted: false }, select: { id: true },
    });
    if (!patient) return _err(res, 404, "Patient not found.");

    const entry = await prisma.patientHistory.create({
      data: {
        patientId,
        visitDate:    visitDate ? new Date(visitDate) : new Date(),
        diagnosis:    "Nursing Observation",
        treatment:    note,
        hospitalName: "ArogyaSeva HMS",
        doctorName:   `Nurse ID: ${req.user.id}`,
        notes:        `[${new Date().toISOString()}] ${note}`,
      },
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "CREATE", resource: "PatientHistory", resourceId: entry.id,
      ipAddress: req.ip, details: { patientId },
    });

    return _ok(res, entry, "Nursing note added.", 201);
  } catch (err) {
    console.error("[nurse] addNursingNote:", err);
    return _err(res, 500, "Failed to add nursing note.");
  }
}

// ── GET /api/nurse/patients ───────────────────────────────────────────────────
// Assigned patients — read-only, no PII editing
async function getAssignedPatients(req, res) {
  const { page = 1, limit = 20, ward } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    // Nurses see patients currently admitted (active admissions)
    const where = {
      dischargedAt: null,
      isDeleted:    false,
      ...(ward && { bed: { room: { type: ward } } }),
    };

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        skip,
        take:    Number(limit),
        orderBy: { admittedAt: "desc" },
        include: {
          patient: {
            select: {
              id: true, patientId: true,
              firstName: true, lastName: true,
              bloodGroup: true, gender: true, dateOfBirth: true,
              allergies: true, chronicConditions: true,
              vitalsReadings: { orderBy: { recordedAt: "desc" }, take: 1 },
            },
          },
          bed:  { select: { bedNumber: true, room: { select: { roomNumber: true, type: true } } } },
        },
      }),
      prisma.admission.count({ where }),
    ]);

    const data = admissions.map(a => ({
      ...a,
      patient: a.patient ? _decPat(a.patient) : null,
    }));

    return _ok(res, { patients: data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) {
    console.error("[nurse] getAssignedPatients:", err);
    return _err(res, 500, "Failed to fetch patients.");
  }
}

// ── POST /api/nurse/alerts/:patientId ────────────────────────────────────────
// Flag critical patient — emit Socket.io event to doctor dashboard
async function flagCriticalPatient(req, res) {
  const { patientId } = req.params;
  const { reason, severity = "HIGH" } = req.body;

  if (!reason) return _err(res, 422, "reason is required.");

  try {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, isDeleted: false },
      select: { id: true, patientId: true, vitalsReadings: { orderBy: { recordedAt: "desc" }, take: 1 } },
    });
    if (!patient) return _err(res, 404, "Patient not found.");

    // Write nursing observation flagging the alert
    const alertNote = await prisma.patientHistory.create({
      data: {
        patientId,
        visitDate:    new Date(),
        diagnosis:    "CRITICAL ALERT",
        treatment:    reason,
        hospitalName: "ArogyaSeva HMS",
        doctorName:   `Nurse ID: ${req.user.id}`,
        notes:        `[CRITICAL][${severity}] ${reason}`,
      },
    });

    // Emit Socket.io event if available (server attaches io to app)
    const io = req.app.get("io");
    if (io) {
      io.emit("nurse:critical-alert", {
        patientId,
        patientCode: patient.patientId,
        severity,
        reason,
        latestVitals: patient.vitalsReadings[0] || null,
        alertedBy:    req.user.id,
        timestamp:    new Date().toISOString(),
      });
    }

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "CREATE", resource: "CriticalAlert", resourceId: alertNote.id,
      ipAddress: req.ip, details: { patientId, severity, reason },
    });

    return _ok(res, { alertNote, socketEmitted: !!io }, "Critical alert sent.", 201);
  } catch (err) {
    console.error("[nurse] flagCriticalPatient:", err);
    return _err(res, 500, "Failed to send alert.");
  }
}

module.exports = {
  recordVitals, updateMedicationStatus, addNursingNote,
  getAssignedPatients, flagCriticalPatient,
};
