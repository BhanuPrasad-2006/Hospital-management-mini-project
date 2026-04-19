/**
 * Pharmacy Module — Controller
 */

const prisma = require("../../config/db");

async function getAllMedicines(req, res) {
  try {
    const { category, search, lowStock } = req.query;
    const where = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (lowStock === "true") where.stock = { lte: prisma.medicine.fields?.reorderLevel || 10 };

    const medicines = await prisma.medicine.findMany({ where, orderBy: { name: "asc" } });
    res.json({ success: true, data: medicines });
  } catch (error) {
    console.error("Get medicines error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch medicines." });
  }
}

async function addMedicine(req, res) {
  try {
    const medicine = await prisma.medicine.create({ data: req.body });
    res.status(201).json({ success: true, data: medicine });
  } catch (error) {
    console.error("Add medicine error:", error);
    res.status(500).json({ success: false, message: "Failed to add medicine." });
  }
}

async function updateStock(req, res) {
  try {
    const { stock } = req.body;
    const medicine = await prisma.medicine.update({
      where: { id: req.params.id },
      data: { stock },
    });
    res.json({ success: true, data: medicine });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ success: false, message: "Failed to update stock." });
  }
}

module.exports = { getAllMedicines, addMedicine, updateStock };
