/**
 * Doctors Module — Controller
 */

const prisma = require("../../config/db");

async function getAllDoctors(req, res) {
  try {
    const { specialization, available } = req.query;
    const where = {};
    if (specialization) where.specialization = specialization;
    if (available !== undefined) where.isAvailable = available === "true";

    const doctors = await prisma.doctor.findMany({
      where,
      include: { user: { select: { email: true, isActive: true } } },
      orderBy: { lastName: "asc" },
    });

    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch doctors." });
  }
}

async function getDoctorById(req, res) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true } },
        appointments: { where: { status: "SCHEDULED" }, orderBy: { dateTime: "asc" }, take: 20 },
      },
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error("Get doctor error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch doctor." });
  }
}

async function updateDoctor(req, res) {
  try {
    const { firstName, lastName, specialization, phone, isAvailable } = req.body;
    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (specialization) data.specialization = specialization;
    if (phone) data.phone = phone;
    if (isAvailable !== undefined) data.isAvailable = isAvailable;

    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error("Update doctor error:", error);
    res.status(500).json({ success: false, message: "Failed to update doctor." });
  }
}

module.exports = { getAllDoctors, getDoctorById, updateDoctor };
