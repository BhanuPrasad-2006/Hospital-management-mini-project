const { Router } = require("express");
const { createAppointment, getAllAppointments, updateAppointmentStatus, cancelAppointment } = require("./appointments.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

router.post("/", authorize("ADMIN", "DOCTOR", "RECEPTIONIST", "PATIENT"), createAppointment);
router.get("/", getAllAppointments);
router.patch("/:id/status", authorize("ADMIN", "DOCTOR", "NURSE"), updateAppointmentStatus);
router.patch("/:id/cancel", authorize("ADMIN", "RECEPTIONIST", "PATIENT"), cancelAppointment);

module.exports = router;
