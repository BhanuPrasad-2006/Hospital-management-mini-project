/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — express-validator Chains (PRD §8.4)           ║
 * ║  Reusable validation middleware for key endpoints               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   router.post("/register", validatePatientRegistration, handleValidation, controller);
 *
 * All chains are composed arrays — spread or use directly as middleware.
 */

"use strict";

const { body, param, query, validationResult } = require("express-validator");

// ─── Shared helpers ────────────────────────────────────────────────────────────

const BLOOD_GROUPS  = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"];
const PAY_METHODS   = ["UPI", "CARD", "CASH", "INSURANCE", "NETBANKING"];
const APPT_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

// PAT-YYYY-XXXX
const PAT_ID_RE  = /^PAT-\d{4}-\d{4}$/;
// DOC-YYYY-SPEC-XXX
const DOC_ID_RE  = /^DOC-\d{4}-[A-Z]{2,4}-\d{3}$/;

/**
 * handleValidation — express-validator result extractor middleware.
 * Call this AFTER your validation chain, BEFORE the controller.
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error:   "Validation failed.",
      code:    "VALIDATION_ERROR",
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// ─── 1. validatePatientRegistration ──────────────────────────────────────────

const validatePatientRegistration = [
  body("firstName")
    .trim().notEmpty().withMessage("First name is required.")
    .isLength({ max: 100 }).withMessage("First name must be under 100 characters."),

  body("lastName")
    .trim().notEmpty().withMessage("Last name is required.")
    .isLength({ max: 100 }).withMessage("Last name must be under 100 characters."),

  body("phone")
    .trim().notEmpty().withMessage("Phone number is required.")
    .matches(/^[6-9]\d{9}$/).withMessage("Phone must be a valid 10-digit Indian mobile number."),

  body("email")
    .optional({ nullable: true })
    .trim().isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .withMessage("Password must contain uppercase, lowercase, digit, and special character."),

  body("dateOfBirth")
    .notEmpty().withMessage("Date of birth is required.")
    .isISO8601().withMessage("Invalid date format. Use YYYY-MM-DD.")
    .custom((val) => {
      const dob = new Date(val);
      const now  = new Date();
      if (dob >= now) throw new Error("Date of birth must be in the past.");
      const age = (now - dob) / (365.25 * 24 * 3600 * 1000);
      if (age > 130)  throw new Error("Invalid date of birth.");
      return true;
    }),

  body("gender")
    .notEmpty().withMessage("Gender is required.")
    .isIn(["MALE", "FEMALE", "OTHER"]).withMessage("Gender must be MALE, FEMALE, or OTHER."),

  body("bloodGroup")
    .optional({ nullable: true })
    .isIn(BLOOD_GROUPS).withMessage(`Blood group must be one of: ${BLOOD_GROUPS.join(", ")}.`),

  body("abhaId")
    .optional({ nullable: true })
    .trim().isLength({ max: 50 }).withMessage("ABHA ID is too long."),
];

// ─── 2. validateAppointment ───────────────────────────────────────────────────

const validateAppointment = [
  body("patientId")
    .optional()   // may be injected from JWT (PATIENT role)
    .trim()
    .custom((val) => {
      if (val && !PAT_ID_RE.test(val)) {
        throw new Error("patientId must be in PAT-YYYY-XXXX format.");
      }
      return true;
    }),

  body("doctorId")
    .notEmpty().withMessage("doctorId is required.")
    .isUUID().withMessage("doctorId must be a valid UUID."),

  body("scheduledAt")
    .notEmpty().withMessage("scheduledAt is required.")
    .isISO8601().withMessage("scheduledAt must be a valid ISO 8601 datetime.")
    .custom((val) => {
      if (new Date(val) <= new Date()) {
        throw new Error("Appointment must be scheduled in the future.");
      }
      return true;
    }),

  body("type")
    .optional()
    .isIn(["WALK_IN", "SCHEDULED", "FOLLOW_UP", "EMERGENCY"])
    .withMessage("Invalid appointment type."),

  body("reason")
    .optional({ nullable: true })
    .trim().isLength({ max: 500 }).withMessage("Reason must be under 500 characters."),
];

// ─── 3. validatePayment ───────────────────────────────────────────────────────

const validatePayment = [
  body("billId")
    .notEmpty().withMessage("billId is required.")
    .isUUID().withMessage("billId must be a valid UUID."),

  body("amount")
    .notEmpty().withMessage("amount is required.")
    .isFloat({ gt: 0 }).withMessage("amount must be a positive number.")
    .toFloat(),

  body("method")
    .notEmpty().withMessage("Payment method is required.")
    .isIn(PAY_METHODS).withMessage(`method must be one of: ${PAY_METHODS.join(", ")}.`),

  body("transactionId")
    .optional({ nullable: true })
    .trim().isLength({ max: 100 }).withMessage("transactionId is too long."),
];

// ─── 4. validateDoctorCreation ────────────────────────────────────────────────

const validateDoctorCreation = [
  body("firstName").trim().notEmpty().withMessage("First name is required."),
  body("lastName").trim().notEmpty().withMessage("Last name is required."),
  body("specialization").trim().notEmpty().withMessage("Specialization is required.")
    .isLength({ max: 100 }).withMessage("Specialization must be under 100 characters."),
  body("licenseNumber").trim().notEmpty().withMessage("License number is required.")
    .isLength({ max: 50 }).withMessage("License number is too long."),
  body("phone").trim().matches(/^[6-9]\d{9}$/).withMessage("Invalid Indian mobile number."),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .withMessage("Password must contain uppercase, lowercase, digit, and special character."),
  body("consultationFee")
    .optional().isFloat({ gt: 0 }).withMessage("consultationFee must be a positive number."),
  body("experienceYears")
    .optional().isInt({ min: 0 }).withMessage("experienceYears must be a non-negative integer."),
];

// ─── 5. validateAdmission ─────────────────────────────────────────────────────

const validateAdmission = [
  body("patientId").notEmpty().isUUID().withMessage("Valid patientId UUID is required."),
  body("doctorId").notEmpty().isUUID().withMessage("Valid doctorId UUID is required."),
  body("bedId").notEmpty().isUUID().withMessage("Valid bedId UUID is required."),
  body("admissionType")
    .optional()
    .isIn(["EMERGENCY", "PLANNED", "TRANSFER"]).withMessage("Invalid admission type."),
];

// ─── 6. validateVitals ────────────────────────────────────────────────────────

const validateVitals = [
  body("patientId").notEmpty().isUUID().withMessage("Valid patientId UUID is required."),
  body("heartRate").optional().isInt({ min: 0, max: 300 }).withMessage("heartRate must be 0–300 bpm."),
  body("spO2").optional().isFloat({ min: 0, max: 100 }).withMessage("spO2 must be 0–100%."),
  body("temperature").optional().isFloat({ min: 25, max: 45 }).withMessage("temperature must be 25–45°C."),
  body("bloodSugar").optional().isFloat({ min: 0 }).withMessage("bloodSugar must be positive."),
  body("respiratoryRate").optional().isInt({ min: 0, max: 60 }).withMessage("respiratoryRate must be 0–60."),
];

module.exports = {
  handleValidation,
  validatePatientRegistration,
  validateAppointment,
  validatePayment,
  validateDoctorCreation,
  validateAdmission,
  validateVitals,
};
