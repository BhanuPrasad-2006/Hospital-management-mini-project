const { Router } = require("express");
const { createEmergency, getEmergencies, dispatchAmbulance, resolveEmergency } = require("./emergency.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();

// Emergency creation can be public (SOS)
router.post("/", createEmergency);

// Management requires authentication
router.get("/", authenticate, authorize("ADMIN", "DOCTOR", "NURSE"), getEmergencies);
router.patch("/:id/dispatch", authenticate, authorize("ADMIN", "NURSE"), dispatchAmbulance);
router.patch("/:id/resolve", authenticate, authorize("ADMIN", "DOCTOR", "NURSE"), resolveEmergency);

module.exports = router;
