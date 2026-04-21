"use strict";

const { Router }       = require("express");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const {
  getInventory, createBloodRequest, registerDonor,
  getNearbyDonors, updateInventory,
} = require("./blood.controller");

const router = Router();

// Public inventory check (patients / public portals may view blood availability)
router.get("/inventory",           getInventory);

// Nearby donors — accessible to authenticated users (patient looking for donors)
router.get("/donors/nearby",       authenticate, getNearbyDonors);

// Create blood request — authenticated (doctor/nurse/admin)
router.post("/request",            authenticate,
  authorize("DOCTOR", "NURSE", "ADMIN", "RECEPTIONIST"), createBloodRequest);

// Register donor — authenticated
router.post("/donors",             authenticate, registerDonor);

// Update inventory — admin only
router.put("/inventory/:bloodGroup",
  authenticate, authorize("ADMIN", "LAB_TECHNICIAN"), updateInventory);

module.exports = router;
