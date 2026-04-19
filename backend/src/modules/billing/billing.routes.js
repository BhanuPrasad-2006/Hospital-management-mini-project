const { Router } = require("express");
const { createBill, getBills, recordPayment } = require("./billing.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

router.post("/", authorize("ADMIN", "RECEPTIONIST"), createBill);
router.get("/", authorize("ADMIN", "RECEPTIONIST", "PATIENT"), getBills);
router.post("/:id/payment", authorize("ADMIN", "RECEPTIONIST"), recordPayment);

module.exports = router;
