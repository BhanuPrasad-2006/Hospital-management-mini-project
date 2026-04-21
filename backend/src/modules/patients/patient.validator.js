/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Patient Module — Zod Validators               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

"use strict";

const { z } = require("zod");

// ─── Shared primitives ─────────────────────────────────────────────────────────

const uuidParam = z.string().uuid("Invalid ID format.");

const indianPhone = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Phone must be a valid 10-digit Indian mobile number.");

const gender = z.enum(["MALE", "FEMALE", "OTHER"]);

const bloodGroup = z.enum(
  ["A_POS", "A_NEG", "B_POS", "B_NEG", "O_POS", "O_NEG", "AB_POS", "AB_NEG"],
  { errorMap: () => ({ message: "Invalid blood group." }) }
);

// ─── Register / Create Patient ────────────────────────────────────────────────

const registerPatientSchema = z.object({
  firstName:   z.string().min(1).max(100),
  lastName:    z.string().min(1).max(100),
  phone:       indianPhone,
  email:       z.string().email().optional(),
  password:    z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
      "Password must contain uppercase, lowercase, digit, and special character."
    ),
  dateOfBirth: z.string().refine(d => !isNaN(Date.parse(d)), "Invalid date of birth."),
  gender,
  bloodGroup:  bloodGroup.optional(),
  abhaId:      z.string().optional(),
  address:     z
    .object({
      street: z.string().optional(),
      city:   z.string().optional(),
      state:  z.string().optional(),
      pin:    z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name:     z.string(),
      phone:    indianPhone,
      relation: z.string(),
    })
    .optional(),
  allergies:         z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
});

// ─── Book Appointment ─────────────────────────────────────────────────────────

const bookAppointmentSchema = z.object({
  doctorId:    uuidParam,
  scheduledAt: z
    .string()
    .refine(d => !isNaN(Date.parse(d)), "Invalid appointment date-time.")
    .refine(d => new Date(d) > new Date(), "Appointment must be in the future."),
  type:        z.enum(["WALK_IN", "SCHEDULED", "FOLLOW_UP", "EMERGENCY"]).default("SCHEDULED"),
  reason:      z.string().max(500).optional(),
  followUpOf:  uuidParam.optional(),
});

// ─── Update Patient Profile ───────────────────────────────────────────────────

const updatePatientSchema = z.object({
  phone:       indianPhone.optional(),
  email:       z.string().email().optional(),
  address:     z
    .object({
      street: z.string().optional(),
      city:   z.string().optional(),
      state:  z.string().optional(),
      pin:    z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name:     z.string(),
      phone:    indianPhone,
      relation: z.string(),
    })
    .optional(),
  allergies:         z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  bloodGroup:        bloodGroup.optional(),
  profilePhotoUrl:   z.string().url().optional(),
});

// ─── Query Params ─────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const appointmentQuerySchema = paginationSchema.extend({
  status: z
    .enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  upcoming: z.coerce.boolean().optional(),
});

const labReportQuerySchema = paginationSchema.extend({
  status:   z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
  testName: z.string().optional(),
});

// ─── Validate helper ──────────────────────────────────────────────────────────

/**
 * Validate req.body against a Zod schema.
 * Returns { data } on success or sends 422 and returns null.
 */
function validate(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(source === "query" ? req.query : req.body);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors:  result.error.flatten().fieldErrors,
      });
    }
    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req.validatedBody = result.data;
    }
    next();
  };
}

module.exports = {
  registerPatientSchema,
  bookAppointmentSchema,
  updatePatientSchema,
  appointmentQuerySchema,
  labReportQuerySchema,
  paginationSchema,
  validate,
};
