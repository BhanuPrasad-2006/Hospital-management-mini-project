"use strict";

const { Router }       = require("express");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const {
  triggerSOS, trackEmergency, resolveEmergency,
  updateLocation, getFleet,
} = require("./emergency.controller");

const router = Router();

// ── EMERGENCY ROUTES ─────────────────────────────────────────────────────────

// PUBLIC — no JWT — critical path for life safety
router.post("/sos", triggerSOS);

// Authenticated routes
router.get("/track/:emergencyId",    authenticate, trackEmergency);
router.put("/:id/resolve",           authenticate, authorize("ADMIN", "SECURITY_OFFICER"), resolveEmergency);

// ── AMBULANCE ROUTES (mounted on /api/emergency for simplicity) ───────────────
// These are re-exported through the same router but live on /api/ambulance in server.js
// So we export separate ambulance handlers too.

module.exports = router;

// Named exports for ambulance routes (imported in ambulance.routes.js)
module.exports.updateLocation = updateLocation;
module.exports.getFleet       = getFleet;
