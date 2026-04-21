"use strict";

const { Router }       = require("express");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const { sensitiveLimiter } = require("../../middleware/ratelimit");
const {
  getPatientCharges, createBill, recordPayment,
  generateQR, reconciliation,
} = require("./billing.controller");

const router = Router();

router.use(authenticate, authorize("ADMIN", "ACCOUNTANT", "RECEPTIONIST"));

router.get("/patient/:patientId",    getPatientCharges);
router.post("/bills",                createBill);
router.post("/payments",             recordPayment);
router.post("/qr",                   sensitiveLimiter, generateQR);
router.get("/reconciliation",        authorize("ADMIN", "ACCOUNTANT"), reconciliation);

module.exports = router;
