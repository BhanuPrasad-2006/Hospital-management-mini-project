"use strict";

const prisma = require("../../config/db");
const { writeAuditLog } = require("../../security/audit");
const { decryptPII, encryptFields, decryptFields,
        DOCTOR_PII_FIELDS, PATIENT_PII_FIELDS } = require("../../security/encrypt");

const _ok  = (res, data, msg = "Success", s = 200) => res.status(s).json({ success: true, message: msg, data });
const _err = (res, s, msg) => res.status(s).json({ success: false, message: msg });

function _dec(doc) { return decryptFields(doc, DOCTOR_PII_FIELDS); }
function _decPat(p) { return decryptFields(p, PATIENT_PII_FIELDS, ["emergencyContact"]); }

// ── GET /api/doctor/dashboard ────────────────────────────────────────────────
// Today's appointments enriched with latest vitals for each patient
async function getDashboard(req, res) {
  try {
    const doctorId = req.user.id;
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end   = new Date(today.setHours(23, 59, 59, 999));

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        isDeleted:   false,
        scheduledAt: { gte: start, lte: end },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        patient: {
          select: {
            id: true, patientId: true, firstName: true, lastName: true,
            bloodGroup: true, allergies: true, chronicConditions: true,
            vitalsReadings: {
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // Decrypt patient PII in each appointment
    const data = appointments.map((appt) => ({
      ...appt,
      patient: appt.patient ? _decPat(appt.patient) : null,
    }));

    const stats = {
      total:       appointments.length,
      pending:     appointments.filter(a => a.status === "PENDING").length,
      inProgress:  appointments.filter(a => a.status === "IN_PROGRESS").length,
      completed:   appointments.filter(a => a.status === "COMPLETED").length,
    };

    return _ok(res, { stats, appointments: data });
  } catch (err) {
    console.error("[doctor] getDashboard:", err);
    return _err(res, 500, "Failed to load dashboard.");
  }
}

// ── POST /api/doctor/prescriptions ───────────────────────────────────────────
// Create prescription with nested PrescriptionMedicine rows (transaction)
async function writePrescription(req, res) {
  const { patientId, diagnosis, icdCode, notes, expiresInDays = 30,
          medicines = [], language = "en" } = req.body;

  if (!patientId || !diagnosis || !medicines.length) {
    return _err(res, 422, "patientId, diagnosis, and at least one medicine are required.");
  }

  try {
    const prescription = await prisma.$transaction(async (tx) => {
      // Verify patient exists and is not deleted
      const patient = await tx.patient.findFirst({
        where: { id: patientId, isDeleted: false },
        select: { id: true },
      });
      if (!patient) { const e = new Error("Patient not found."); e.status = 404; throw e; }

      return tx.prescription.create({
        data: {
          patientId,
          doctorId:   req.user.id,
          diagnosis,
          icdCode:    icdCode    || null,
          notes:      notes      || null,
          language,
          expiresAt:  new Date(Date.now() + expiresInDays * 86_400_000),
          medicines: {
            create: medicines.map(m => ({
              medicineName:  m.name,
              genericName:   m.genericName  || null,
              dose:          m.dose,
              frequency:     m.frequency,
              timing:        m.timing       || "As directed",
              durationDays:  m.durationDays || 7,
              purpose:       m.purpose      || null,
              sideEffects:   m.sideEffects  || [],
              quantity:      m.quantity     || null,
            })),
          },
        },
        include: { medicines: true },
      });
    });

    await writeAuditLog({
      entityType: "DOCTOR", entityId: req.user.id,
      action: "CREATE", resource: "Prescription", resourceId: prescription.id,
      ipAddress: req.ip, userAgent: req.headers["user-agent"],
      details: { patientId, medicineCount: medicines.length },
    });

    return _ok(res, prescription, "Prescription created.", 201);
  } catch (err) {
    if (err.status) return _err(res, err.status, err.message);
    console.error("[doctor] writePrescription:", err);
    return _err(res, 500, "Failed to create prescription.");
  }
}

// ── GET /api/doctor/patients ──────────────────────────────────────────────────
// All patients who have had appointments with this doctor, with full history
async function getMyPatients(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Distinct patient IDs from appointments
    const appts = await prisma.appointment.findMany({
      where:    { doctorId: req.user.id, isDeleted: false },
      select:   { patientId: true },
      distinct: ["patientId"],
      skip,
      take:     Number(limit),
    });

    const patientIds = appts.map(a => a.patientId);
    const total      = await prisma.appointment.groupBy({
      by:    ["patientId"],
      where: { doctorId: req.user.id, isDeleted: false },
    }).then(g => g.length);

    const patients = await prisma.patient.findMany({
      where: { id: { in: patientIds }, isDeleted: false },
      include: {
        history:          { orderBy: { visitDate: "desc" }, take: 5 },
        prescriptions:    { where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 3,
                            include: { medicines: true } },
        vitalsReadings:   { orderBy: { recordedAt: "desc" }, take: 1 },
        labReports:       { where: { isDeleted: false }, orderBy: { testDate: "desc" }, take: 3 },
      },
    });

    const data = patients.map(_decPat);
    return _ok(res, { patients: data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) {
    console.error("[doctor] getMyPatients:", err);
    return _err(res, 500, "Failed to fetch patients.");
  }
}

// ── POST /api/doctor/leave ───────────────────────────────────────────────────
async function submitLeave(req, res) {
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason) {
    return _err(res, 422, "startDate, endDate, and reason are required.");
  }
  if (new Date(startDate) >= new Date(endDate)) {
    return _err(res, 422, "endDate must be after startDate.");
  }

  try {
    const leave = await prisma.doctorLeave.create({
      data: {
        doctorId:  req.user.id,
        startDate: new Date(startDate),
        endDate:   new Date(endDate),
        reason,
        approved:  null, // pending
      },
    });

    await writeAuditLog({
      entityType: "DOCTOR", entityId: req.user.id,
      action: "CREATE", resource: "DoctorLeave", resourceId: leave.id,
      ipAddress: req.ip, details: { startDate, endDate, reason },
    });

    return _ok(res, leave, "Leave application submitted.", 201);
  } catch (err) {
    console.error("[doctor] submitLeave:", err);
    return _err(res, 500, "Failed to submit leave.");
  }
}

// ── GET /api/doctor/lab-reports/:patientId ───────────────────────────────────
// RLS: doctor must have at least one appointment with this patient
async function getPatientLabReports(req, res) {
  const { patientId } = req.params;
  const { page = 1, limit = 20, status } = req.query;

  try {
    // RLS: confirm relationship
    const relationship = await prisma.appointment.findFirst({
      where: { doctorId: req.user.id, patientId, isDeleted: false },
      select: { id: true },
    });
    if (!relationship) return _err(res, 403, "You have no appointment history with this patient.");

    const where = { patientId, isDeleted: false, ...(status && { status }) };
    const skip  = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      prisma.labReport.findMany({ where, orderBy: { testDate: "desc" }, skip, take: Number(limit) }),
      prisma.labReport.count({ where }),
    ]);

    await writeAuditLog({
      entityType: "DOCTOR", entityId: req.user.id,
      action: "READ", resource: "LabReport", ipAddress: req.ip,
      details: { patientId, count: reports.length },
    });

    return _ok(res, { reports, pagination: { page: Number(page), total } });
  } catch (err) {
    console.error("[doctor] getPatientLabReports:", err);
    return _err(res, 500, "Failed to fetch lab reports.");
  }
}

// ── PUT /api/doctor/appointments/:id/status ──────────────────────────────────
async function updateAppointmentStatus(req, res) {
  const { id }     = req.params;
  const { status } = req.body;
  const allowed    = ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

  if (!allowed.includes(status)) {
    return _err(res, 422, `Status must be one of: ${allowed.join(", ")}`);
  }

  try {
    const appt = await prisma.appointment.findFirst({
      where: { id, doctorId: req.user.id, isDeleted: false },
    });
    if (!appt) return _err(res, 404, "Appointment not found.");

    const old = appt.status;
    const updated = await prisma.appointment.update({
      where: { id },
      data:  { status },
    });

    await writeAuditLog({
      entityType: "DOCTOR", entityId: req.user.id,
      action: "UPDATE", resource: "Appointment", resourceId: id,
      ipAddress: req.ip,
      details: { oldStatus: old, newStatus: status },
    });

    return _ok(res, updated, `Appointment status updated to ${status}.`);
  } catch (err) {
    console.error("[doctor] updateAppointmentStatus:", err);
    return _err(res, 500, "Failed to update appointment.");
  }
}

module.exports = {
  getDashboard, writePrescription, getMyPatients,
  submitLeave, getPatientLabReports, updateAppointmentStatus,
};
