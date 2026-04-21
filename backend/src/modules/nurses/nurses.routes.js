"use strict";

const { Router }       = require("express");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const {
  recordVitals, updateMedicationStatus, addNursingNote,
  getAssignedPatients, flagCriticalPatient,
} = require("./nurses.controller");

const router = Router();

router.use(authenticate, authorize("NURSE"));

router.post("/vitals",                    recordVitals);
router.put("/medications/:id",            updateMedicationStatus);
router.post("/notes/:patientId",          addNursingNote);
router.get("/patients",                   getAssignedPatients);
router.post("/alerts/:patientId",         flagCriticalPatient);

module.exports = router;
