/**
 * Patients Module — Routes
 */

const { Router } = require("express");
const { getAllPatients, getPatientById, updatePatient, deletePatient } = require("./patients.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");
const { auditAction } = require("../../middleware/audit");

const router = Router();

// All patient routes require authentication
router.use(authenticate);

router.get("/", authorize("ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"), getAllPatients);
router.get("/:id", authorize("ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "PATIENT"), getPatientById);
router.put("/:id", authorize("ADMIN", "RECEPTIONIST", "PATIENT"), auditAction("UPDATE", "Patient"), updatePatient);
router.delete("/:id", authorize("ADMIN"), auditAction("DELETE", "Patient"), deletePatient);

module.exports = router;
