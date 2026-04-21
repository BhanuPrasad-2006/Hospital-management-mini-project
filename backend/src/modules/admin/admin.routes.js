"use strict";

const { Router }       = require("express");
const { authenticate } = require("../../middleware/auth");
const { authorize }    = require("../../middleware/rbac");
const {
  getDashboard, createDoctor, deleteDoctor,
  registerPatient, getAdmissions, admitPatient, dischargePatient,
} = require("./admin.controller");

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard",                    getDashboard);
router.post("/doctors",                     createDoctor);
router.delete("/doctors/:id",               deleteDoctor);
router.post("/patients",                    registerPatient);
router.get("/admissions",                   getAdmissions);
router.post("/admissions",                  admitPatient);
router.put("/admissions/:id/discharge",     dischargePatient);

module.exports = router;
