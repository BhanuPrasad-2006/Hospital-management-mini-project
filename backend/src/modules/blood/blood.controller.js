/**
 * Blood Bank Module — Controller
 */

const prisma = require("../../config/db");

async function getDonors(req, res) {
  try {
    const { bloodGroup, eligible } = req.query;
    const where = {};
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (eligible !== undefined) where.isEligible = eligible === "true";

    const donors = await prisma.bloodDonor.findMany({ where, orderBy: { lastName: "asc" } });
    res.json({ success: true, data: donors });
  } catch (error) {
    console.error("Get donors error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch donors." });
  }
}

async function registerDonor(req, res) {
  try {
    const donor = await prisma.bloodDonor.create({ data: req.body });
    res.status(201).json({ success: true, data: donor });
  } catch (error) {
    console.error("Register donor error:", error);
    res.status(500).json({ success: false, message: "Failed to register donor." });
  }
}

async function getInventory(req, res) {
  try {
    const inventory = await prisma.bloodInventory.findMany({ orderBy: { bloodGroup: "asc" } });
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error("Get inventory error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blood inventory." });
  }
}

async function updateInventory(req, res) {
  try {
    const { bloodGroup, units, expiryDate } = req.body;

    const inventory = await prisma.bloodInventory.upsert({
      where: { id: req.params.id || "new" },
      update: { units, expiryDate: new Date(expiryDate) },
      create: { bloodGroup, units, expiryDate: new Date(expiryDate) },
    });

    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error("Update inventory error:", error);
    res.status(500).json({ success: false, message: "Failed to update blood inventory." });
  }
}

module.exports = { getDonors, registerDonor, getInventory, updateInventory };
