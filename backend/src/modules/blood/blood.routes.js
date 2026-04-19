const { Router } = require("express");
const { getDonors, registerDonor, getInventory, updateInventory } = require("./blood.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize } = require("../../middleware/rbac");

const router = Router();
router.use(authenticate);

router.get("/donors", getDonors);
router.post("/donors", authorize("ADMIN", "NURSE"), registerDonor);
router.get("/inventory", getInventory);
router.put("/inventory/:id", authorize("ADMIN", "NURSE"), updateInventory);

module.exports = router;
