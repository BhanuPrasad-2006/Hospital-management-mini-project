"use strict";

const { Router }       = require("express");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const { updateLocation, getFleet } = require("../emergency/emergency.routes");

const router = Router();

// POST /api/ambulance/location — driver posts GPS every 10 seconds
router.post(
  "/location",
  authenticate,
  authorize("AMBULANCE_DRIVER"),
  updateLocation
);

// GET /api/ambulance/fleet — admin view
router.get(
  "/fleet",
  authenticate,
  authorize("ADMIN", "SECURITY_OFFICER"),
  getFleet
);

module.exports = router;
