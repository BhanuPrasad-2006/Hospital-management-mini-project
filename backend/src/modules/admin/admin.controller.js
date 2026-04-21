"use strict";

const bcrypt = require("bcryptjs");
const prisma = require("../../config/db");
const { writeAuditLog } = require("../../security/audit");
const {
  encryptFields, decryptFields,
  PATIENT_PII_FIELDS, PATIENT_PII_JSON_FIELDS, DOCTOR_PII_FIELDS,
} = require("../../security/encrypt");
const { generateAccessToken } = require("../../middleware/auth");

const SALT_ROUNDS = 12;
const _ok  = (res, data, msg = "Success", s = 200) => res.status(s).json({ success: true, message: msg, data });
const _err = (res, s, msg) => res.status(s).json({ success: false, message: msg });

// ─── ID Generators ────────────────────────────────────────────────────────────

async function _genDoctorId(tx, specialization) {
  const spec = (specialization || "GEN").substring(0, 4).toUpperCase();
  const year = new Date().getFullYear();
  const prefix = `DOC-${year}-${spec}-`;
  const last = await tx.doctor.findFirst({
    where: { doctorCode: { startsWith: prefix } }, orderBy: { doctorCode: "desc" },
    select: { doctorCode: true },
  });
  const next = last ? parseInt(last.doctorCode.split("-").pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

async function _genPatientId(tx) {
  const year = new Date().getFullYear();
  const prefix = `PAT-${year}-`;
  const last = await tx.patient.findFirst({
    where: { patientId: { startsWith: prefix } }, orderBy: { patientId: "desc" },
    select: { patientId: true },
  });
  const next = last ? parseInt(last.patientId.split("-").pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

async function _genStaffId(tx, role) {
  const roleTag = (role || "STF").substring(0, 3).toUpperCase();
  const prefix  = `STF-${roleTag}-`;
  const last = await tx.staff.findFirst({
    where: { staffId: { startsWith: prefix } }, orderBy: { staffId: "desc" },
    select: { staffId: true },
  });
  const next = last ? parseInt(last.staffId.split("-").pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
async function getDashboard(req, res) {
  try {
    const today = new Date();
    const dayStart = new Date(today.setHours(0, 0, 0, 0));
    const dayEnd   = new Date(today.setHours(23, 59, 59, 999));

    const [
      totalPatients, activeDoctors, availableBeds,
      todayAppointments, activeEmergencies,
      todayRevenue, totalBloodUnits, lowStockCount,
    ] = await Promise.all([
      prisma.patient.count({ where: { isDeleted: false } }),
      prisma.doctor.count({ where: { isDeleted: false, isActive: true } }),
      prisma.bed.count({ where: { status: "AVAILABLE" } }),
      prisma.appointment.count({ where: { scheduledAt: { gte: dayStart, lte: dayEnd }, isDeleted: false } }),
      prisma.emergency.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.bloodInventory.aggregate({ _sum: { unitsAvailable: true } }),
      prisma.medicine.count({ where: { isDeleted: false, isActive: true,
        stockUnits: { lte: prisma.medicine.fields.reorderLevel } } }).catch(() => 0),
    ]);

    return _ok(res, {
      totalPatients,
      activeDoctors,
      availableBeds,
      todayAppointments,
      activeEmergencies,
      todayRevenue:    todayRevenue._sum.amount     || 0,
      totalBloodUnits: totalBloodUnits._sum.unitsAvailable || 0,
      lowStockAlerts:  lowStockCount,
    });
  } catch (err) {
    console.error("[admin] getDashboard:", err);
    return _err(res, 500, "Failed to load dashboard.");
  }
}

// ─── POST /api/admin/doctors ──────────────────────────────────────────────────
async function createDoctor(req, res) {
  const {
    firstName, lastName, specialization, licenseNumber,
    phone, email, password, consultationFee = 500,
    availableDays = [], availableFrom, availableTo,
    departmentId, qualifications = [], experienceYears = 0, bio,
  } = req.body;

  if (!firstName || !lastName || !specialization || !licenseNumber || !phone || !password) {
    return _err(res, 422, "firstName, lastName, specialization, licenseNumber, phone, password are required.");
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const doctor = await prisma.$transaction(async (tx) => {
      const doctorCode = await _genDoctorId(tx, specialization);

      return tx.doctor.create({
        data: {
          doctorCode,
          firstName,
          lastName,
          specialization,
          licenseNumber,
          ...encryptFields({ phone, email: email || null }, DOCTOR_PII_FIELDS),
          passwordHash,
          consultationFee,
          availableDays,
          availableFrom: availableFrom || null,
          availableTo:   availableTo   || null,
          departmentId:  departmentId  || null,
          qualifications,
          experienceYears,
          bio: bio || null,
        },
      });
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "CREATE", resource: "Doctor", resourceId: doctor.id,
      ipAddress: req.ip, details: { doctorCode: doctor.doctorCode, specialization },
    });

    return _ok(res, { ...doctor, phone: undefined, email: undefined,
      doctorCode: doctor.doctorCode }, "Doctor account created.", 201);
  } catch (err) {
    if (err.code === "P2002") return _err(res, 409, "A doctor with this license number already exists.");
    console.error("[admin] createDoctor:", err);
    return _err(res, 500, "Failed to create doctor.");
  }
}

// ─── DELETE /api/admin/doctors/:id ───────────────────────────────────────────
async function deleteDoctor(req, res) {
  const { id } = req.params;
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id }, select: { id: true, isDeleted: true, doctorCode: true },
    });
    if (!doctor || doctor.isDeleted) return _err(res, 404, "Doctor not found.");

    // Soft-delete + revoke all active sessions (transaction)
    await prisma.$transaction([
      prisma.doctor.update({
        where: { id },
        data:  { isDeleted: true, isActive: false, deletedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where:  { doctorId: id, isActive: true },
        data:   { isActive: false, logoutAt: new Date() },
      }),
    ]);

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "DELETE", resource: "Doctor", resourceId: id,
      ipAddress: req.ip, details: { doctorCode: doctor.doctorCode },
    });

    return _ok(res, null, "Doctor account deactivated and sessions revoked.");
  } catch (err) {
    console.error("[admin] deleteDoctor:", err);
    return _err(res, 500, "Failed to delete doctor.");
  }
}

// ─── POST /api/admin/patients ─────────────────────────────────────────────────
async function registerPatient(req, res) {
  const {
    firstName, lastName, phone, email, password,
    dateOfBirth, gender, bloodGroup, abhaId,
    address, emergencyContact, allergies = [], chronicConditions = [],
  } = req.body;

  if (!firstName || !lastName || !phone || !dateOfBirth || !gender || !password) {
    return _err(res, 422, "firstName, lastName, phone, dateOfBirth, gender, password are required.");
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const patient = await prisma.$transaction(async (tx) => {
      const patientId = await _genPatientId(tx);
      return tx.patient.create({
        data: {
          patientId,
          ...encryptFields(
            { firstName, lastName, phone, email: email || null,
              address: address || null, emergencyContact: emergencyContact || null },
            PATIENT_PII_FIELDS, PATIENT_PII_JSON_FIELDS
          ),
          passwordHash,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          bloodGroup:        bloodGroup  || null,
          abhaId:            abhaId      || null,
          allergies,
          chronicConditions,
          settings: { create: { preferredLanguage: "en" } },
        },
      });
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "CREATE", resource: "Patient", resourceId: patient.id,
      ipAddress: req.ip, details: { patientId: patient.patientId },
    });

    return _ok(res, {
      id: patient.id, patientId: patient.patientId,
      firstName, lastName, gender, bloodGroup: patient.bloodGroup,
    }, "Patient registered.", 201);
  } catch (err) {
    if (err.code === "P2002") return _err(res, 409, "Patient with this ABHA ID already exists.");
    console.error("[admin] registerPatient:", err);
    return _err(res, 500, "Failed to register patient.");
  }
}

// ─── GET /api/admin/admissions ────────────────────────────────────────────────
async function getAdmissions(req, res) {
  const { page = 1, limit = 20, active = "true" } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const where = {
      isDeleted: false,
      ...(active === "true" && { dischargedAt: null }),
    };

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where, skip, take: Number(limit),
        orderBy: { admittedAt: "desc" },
        include: {
          patient: {
            select: {
              id: true, patientId: true, firstName: true, lastName: true,
              bloodGroup: true, gender: true,
            },
          },
          doctor: { select: { id: true, doctorCode: true, firstName: true, lastName: true, specialization: true } },
          bed:    { include: { room: { select: { roomNumber: true, type: true, floor: true } } } },
        },
      }),
      prisma.admission.count({ where }),
    ]);

    const data = admissions.map(a => ({
      ...a,
      patient: a.patient ? decryptFields(a.patient, PATIENT_PII_FIELDS) : null,
    }));

    return _ok(res, { admissions: data, pagination: { page: Number(page), total } });
  } catch (err) {
    console.error("[admin] getAdmissions:", err);
    return _err(res, 500, "Failed to fetch admissions.");
  }
}

// ─── POST /api/admin/admissions ───────────────────────────────────────────────
// Admit patient: assign bed → OCCUPIED + create Admission (transaction)
async function admitPatient(req, res) {
  const { patientId, doctorId, bedId, admissionType = "PLANNED",
          diagnosis, chiefComplaint, icdCode } = req.body;

  if (!patientId || !doctorId || !bedId) {
    return _err(res, 422, "patientId, doctorId, and bedId are required.");
  }

  try {
    const admission = await prisma.$transaction(async (tx) => {
      // Check bed is actually available
      const bed = await tx.bed.findUnique({
        where: { id: bedId }, select: { id: true, status: true, bedNumber: true },
      });
      if (!bed) { const e = new Error("Bed not found."); e.status = 404; throw e; }
      if (bed.status !== "AVAILABLE") {
        const e = new Error(`Bed ${bed.bedNumber} is currently ${bed.status}.`); e.status = 409; throw e;
      }

      // Mark bed OCCUPIED
      await tx.bed.update({
        where: { id: bedId },
        data:  { status: "OCCUPIED", currentPatientId: patientId, admittedAt: new Date() },
      });

      // Create Admission record
      return tx.admission.create({
        data: {
          patientId, doctorId, bedId,
          admissionType,
          diagnosis:     diagnosis     || null,
          chiefComplaint: chiefComplaint || null,
          icdCode:       icdCode       || null,
        },
        include: {
          patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
          bed:     { include: { room: { select: { roomNumber: true, type: true } } } },
        },
      });
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "CREATE", resource: "Admission", resourceId: admission.id,
      ipAddress: req.ip, details: { patientId, doctorId, bedId, admissionType },
    });

    return _ok(res, admission, "Patient admitted successfully.", 201);
  } catch (err) {
    if (err.status) return _err(res, err.status, err.message);
    console.error("[admin] admitPatient:", err);
    return _err(res, 500, "Failed to admit patient.");
  }
}

// ─── PUT /api/admin/admissions/:id/discharge ──────────────────────────────────
// Discharge: free bed → AVAILABLE, set dischargedAt (transaction)
async function dischargePatient(req, res) {
  const { id } = req.params;
  const { dischargeNotes, dischargeSummary, followUpDate } = req.body;

  try {
    const discharge = await prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findUnique({
        where: { id, isDeleted: false },
        select: { id: true, bedId: true, patientId: true, dischargedAt: true },
      });
      if (!admission) { const e = new Error("Admission not found."); e.status = 404; throw e; }
      if (admission.dischargedAt) { const e = new Error("Patient already discharged."); e.status = 409; throw e; }

      const now = new Date();

      // Free the bed
      await tx.bed.update({
        where: { id: admission.bedId },
        data:  { status: "AVAILABLE", currentPatientId: null, admittedAt: null },
      });

      // Update admission record
      return tx.admission.update({
        where: { id },
        data:  {
          dischargedAt: now,
          dischargeNotes:    dischargeNotes    || null,
          dischargeSummary:  dischargeSummary  || null,
          followUpDate:      followUpDate ? new Date(followUpDate) : null,
        },
      });
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "UPDATE", resource: "Admission", resourceId: id,
      ipAddress: req.ip, details: { action: "DISCHARGE", patientId: discharge.patientId },
    });

    return _ok(res, discharge, "Patient discharged successfully.");
  } catch (err) {
    if (err.status) return _err(res, err.status, err.message);
    console.error("[admin] dischargePatient:", err);
    return _err(res, 500, "Failed to discharge patient.");
  }
}

module.exports = {
  getDashboard, createDoctor, deleteDoctor,
  registerPatient, getAdmissions, admitPatient, dischargePatient,
};
