const { Router } = require("express");
const { getAllDoctors, getDoctorById, updateDoctor } = require("./doctors.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();

router.use(authenticate);

router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", authorize("ADMIN", "DOCTOR"), updateDoctor);

module.exports = router;
