/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Patient Module — Routes                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Mount in server.js:
 *   app.use("/api/patients", require("./modules/patients/patients.routes"));
 *
 * Route table:
 *   POST   /api/patients/register           Public  — register new patient
 *   GET    /api/patients/me                 Patient — own profile
 *   PUT    /api/patients/me                 Patient — update own profile
 *   POST   /api/patients/appointments       Patient — book appointment (Tx)
 *   GET    /api/patients/appointments       Patient — list own appointments
 *   DELETE /api/patients/appointments/:id   Patient — cancel own appointment
 *   GET    /api/patients/prescriptions      Patient — list own prescriptions
 *   GET    /api/patients/lab-reports        Patient — list own lab reports
 */

"use strict";

const { Router } = require("express");

const {
  registerPatient,
  getMyProfile,
  updateMyProfile,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  viewPrescriptions,
  getLabReports,
} = require("./patients.controller");

const { authenticate }     = require("../../middleware/auth");
const { authorize }        = require("../../middleware/rbac");
const { authLimiter }      = require("../../middleware/ratelimit");

const {
  registerPatientSchema,
  bookAppointmentSchema,
  updatePatientSchema,
  appointmentQuerySchema,
  labReportQuerySchema,
  paginationSchema,
  validate,
} = require("./patient.validator");

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/patients/register
router.post(
  "/register",
  authLimiter,                                       // 10 req / 15 min per IP
  validate(registerPatientSchema, "body"),
  registerPatient
);

// ─── Authenticated — PATIENT role only ───────────────────────────────────────

// All routes below require a valid PATIENT JWT
router.use(authenticate, authorize("PATIENT"));

// Profile
router.get("/me",  getMyProfile);
router.put("/me",  validate(updatePatientSchema, "body"), updateMyProfile);

// Appointments
router.post(
  "/appointments",
  validate(bookAppointmentSchema,   "body"),
  bookAppointment
);
router.get(
  "/appointments",
  validate(appointmentQuerySchema,  "query"),
  getMyAppointments
);
router.delete("/appointments/:id", cancelAppointment);

// Prescriptions
router.get(
  "/prescriptions",
  validate(paginationSchema,        "query"),
  viewPrescriptions
);

// Lab reports
router.get(
  "/lab-reports",
  validate(labReportQuerySchema,    "query"),
  getLabReports
);

module.exports = router;
