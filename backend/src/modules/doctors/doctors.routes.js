"use strict";

const { Router }    = require("express");
const { authenticate }  = require("../../middleware/auth");
const { authorize }     = require("../../middleware/rbac");
const {
  getDashboard, writePrescription, getMyPatients,
  submitLeave, getPatientLabReports, updateAppointmentStatus,
} = require("./doctors.controller");

const router = Router();

router.use(authenticate, authorize("DOCTOR"));

router.get("/dashboard",                         getDashboard);
router.post("/prescriptions",                    writePrescription);
router.get("/patients",                          getMyPatients);
router.post("/leave",                            submitLeave);
router.get("/lab-reports/:patientId",            getPatientLabReports);
router.put("/appointments/:id/status",           updateAppointmentStatus);

module.exports = router;
