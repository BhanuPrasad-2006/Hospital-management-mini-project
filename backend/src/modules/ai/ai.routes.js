const { Router } = require("express");
const { proxyToAI, aiHealthCheck } = require("./ai.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();

router.get("/health", aiHealthCheck);

// AI endpoints — require authentication
router.post("/prescription-scan", authenticate, authorize("DOCTOR", "NURSE", "PHARMACIST"), proxyToAI("/api/prescription-scan"));
router.post("/diagnosis-assist", authenticate, authorize("DOCTOR"), proxyToAI("/api/diagnosis-assist"));
router.post("/triage", authenticate, authorize("DOCTOR", "NURSE"), proxyToAI("/api/triage"));

module.exports = router;
