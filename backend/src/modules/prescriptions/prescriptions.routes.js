const { Router } = require("express");
const { createPrescription, getPrescriptions, getPrescriptionById, updatePrescriptionStatus } = require("./prescriptions.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

router.post("/", authorize("DOCTOR"), createPrescription);
router.get("/", authorize("ADMIN", "DOCTOR", "NURSE", "PHARMACIST"), getPrescriptions);
router.get("/:id", getPrescriptionById);
router.patch("/:id/status", authorize("DOCTOR", "PHARMACIST"), updatePrescriptionStatus);

module.exports = router;
