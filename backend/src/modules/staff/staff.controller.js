/**
 * Staff Module — Controller
 */

const prisma = require("../../config/db");

async function getAllStaff(req, res) {
  try {
    const staff = await prisma.staff.findMany({
      include: { user: { select: { email: true, role: true, isActive: true } } },
      orderBy: { lastName: "asc" },
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch staff." });
  }
}

async function getStaffById(req, res) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { email: true, role: true } } },
    });
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found." });
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch staff member." });
  }
}

async function updateStaff(req, res) {
  try {
    const { firstName, lastName, department, position, phone } = req.body;
    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (department) data.department = department;
    if (position) data.position = position;
    if (phone) data.phone = phone;

    const staff = await prisma.staff.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({ success: false, message: "Failed to update staff." });
  }
}

module.exports = { getAllStaff, getStaffById, updateStaff };
