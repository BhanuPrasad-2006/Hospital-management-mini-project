const { Router } = require("express");
const { getAllMedicines, addMedicine, updateStock } = require("./pharmacy.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

router.get("/", getAllMedicines);
router.post("/", authorize("ADMIN", "PHARMACIST"), addMedicine);
router.patch("/:id/stock", authorize("ADMIN", "PHARMACIST"), updateStock);

module.exports = router;
