const { Router } = require("express");
const { getAllStaff, getStaffById, updateStaff } = require("./staff.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

router.get("/", authorize("ADMIN"), getAllStaff);
router.get("/:id", authorize("ADMIN"), getStaffById);
router.put("/:id", authorize("ADMIN"), updateStaff);

module.exports = router;
