/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — RBAC Middleware                               ║
 * ║  Role-Based Access Control for Zero Trust Architecture          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Roles in the system:
 *
 *   Top-level entity types  →  "PATIENT" | "DOCTOR" | "STAFF"
 *   Staff sub-roles (StaffRole enum in Prisma):
 *     ADMIN | RECEPTIONIST | NURSE | PHARMACIST |
 *     LAB_TECHNICIAN | ACCOUNTANT | SECURITY_OFFICER |
 *     HOUSEKEEPING | AMBULANCE_DRIVER
 *
 * Usage:
 *   router.get("/admin",     authenticate, authorize("ADMIN"), handler);
 *   router.get("/clinical",  authenticate, authorize("DOCTOR","NURSE"), handler);
 *   router.get("/me/:id",    authenticate, authorizeOwnerOrRoles("id","ADMIN"), handler);
 *   router.get("/verify",    authenticate, requireVerified, handler);
 */

"use strict";

const prisma = require("../config/db");

// ─── Role Sets (convenience constants) ────────────────────────────────────────

const ROLES = Object.freeze({
  // Top-level entity types
  PATIENT: "PATIENT",
  DOCTOR:  "DOCTOR",
  STAFF:   "STAFF",

  // Staff sub-roles
  ADMIN:             "ADMIN",
  RECEPTIONIST:      "RECEPTIONIST",
  NURSE:             "NURSE",
  PHARMACIST:        "PHARMACIST",
  LAB_TECHNICIAN:    "LAB_TECHNICIAN",
  ACCOUNTANT:        "ACCOUNTANT",
  SECURITY_OFFICER:  "SECURITY_OFFICER",
  HOUSEKEEPING:      "HOUSEKEEPING",
  AMBULANCE_DRIVER:  "AMBULANCE_DRIVER",
});

// Pre-defined role groups for common use cases
const CLINICAL_STAFF = ["DOCTOR", "NURSE", "LAB_TECHNICIAN"];
const ADMIN_STAFF    = ["ADMIN", "RECEPTIONIST"];
const ALL_STAFF      = Object.values(ROLES).filter(r => r !== "PATIENT" && r !== "DOCTOR" && r !== "STAFF");

// ─── Core RBAC Middleware ─────────────────────────────────────────────────────

/**
 * authorize(...allowedRoles)
 *
 * Returns middleware that allows only the specified roles.
 * Works with both entity types (DOCTOR, PATIENT) and staff sub-roles (ADMIN, NURSE…).
 *
 * @param {...string} allowedRoles
 *
 * @example
 *   router.delete("/patient/:id", authenticate, authorize("ADMIN"), deletePatient);
 *   router.post("/prescription",  authenticate, authorize("DOCTOR"), createPrescription);
 */
function authorize(...allowedRoles) {
  if (allowedRoles.length === 0) {
    throw new Error("[RBAC] authorize() requires at least one role.");
  }

  return async (req, res, next) => {
    if (!req.user) {
      return _deny(res, 401, "Authentication required.");
    }

    // req.user.role holds the role from the JWT payload.
    // For Staff entities this is the StaffRole (e.g. "ADMIN").
    // For Doctor/Patient entities it is the entityType (e.g. "DOCTOR").
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return _deny(
        res,
        403,
        `Access denied. Required: [${allowedRoles.join(", ")}]. Your role: ${userRole}.`
      );
    }

    next();
  };
}

/**
 * authorizeOwnerOrRoles(paramName, ...exemptRoles)
 *
 * Grants access if:
 *   (a) The authenticated user's ID matches req.params[paramName], OR
 *   (b) The user has one of the specified exempt roles.
 *
 * @param {string}    paramName   - URL param that holds the target entity ID
 * @param {...string} exemptRoles - Roles that bypass the ownership check
 *
 * @example
 *   router.get("/patients/:id", authenticate, authorizeOwnerOrRoles("id","ADMIN","RECEPTIONIST"), getPatient);
 */
function authorizeOwnerOrRoles(paramName = "id", ...exemptRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return _deny(res, 401, "Authentication required.");
    }

    const targetId  = req.params[paramName];
    const isOwner   = req.user.id === targetId;
    const isExempt  = exemptRoles.includes(req.user.role);

    if (!isOwner && !isExempt) {
      return _deny(res, 403, "Access denied. You may only access your own resources.");
    }

    next();
  };
}

/**
 * requireVerified
 *
 * Checks that the authenticated entity has a APPROVED verification record.
 * Use this to protect routes that require admin-approved profiles
 * (e.g., a doctor viewing clinical data must be verified first).
 *
 * Skips the check for ADMIN role (admins are always trusted).
 */
async function requireVerified(req, res, next) {
  if (!req.user) {
    return _deny(res, 401, "Authentication required.");
  }

  // Admins are exempt
  if (req.user.role === "ADMIN") return next();

  try {
    const { id, entityType } = req.user;

    const verification = await prisma.verification.findFirst({
      where: {
        ...(entityType === "PATIENT" && { patientId: id }),
        ...(entityType === "DOCTOR"  && { doctorId:  id }),
        ...(entityType === "STAFF"   && { staffId:   id }),
        isVerified: true,
        status: "APPROVED",
      },
      select: { id: true },
    });

    if (!verification) {
      return _deny(
        res,
        403,
        "Your account is pending verification. Please wait for admin approval."
      );
    }

    next();
  } catch (err) {
    console.error("[RBAC] requireVerified error:", err.message);
    return _deny(res, 500, "Authorization check failed.");
  }
}

/**
 * requireSelf
 *
 * Ensures the authenticated user is operating on their own record.
 * Simpler alternative to authorizeOwnerOrRoles when no role exemptions needed.
 *
 * @param {string} paramName - URL param holding the entity ID
 */
function requireSelf(paramName = "id") {
  return (req, res, next) => {
    if (!req.user) return _deny(res, 401, "Authentication required.");

    if (req.user.id !== req.params[paramName]) {
      return _deny(res, 403, "You may only modify your own account.");
    }
    next();
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _deny(res, status, message) {
  return res.status(status).json({ success: false, message });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  authorize,
  authorizeOwnerOrRoles,
  requireVerified,
  requireSelf,
  ROLES,
  CLINICAL_STAFF,
  ADMIN_STAFF,
  ALL_STAFF,
};
