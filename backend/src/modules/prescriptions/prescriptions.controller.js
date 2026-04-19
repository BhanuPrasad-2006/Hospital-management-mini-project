/**
 * Prescriptions Module — Controller
 */

const prisma = require("../../config/db");

async function createPrescription(req, res) {
  try {
    const { patientId, diagnosis, notes, items } = req.body;

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId: req.user.id, // Prescribing doctor
        diagnosis,
        notes,
        items: {
          create: items || [],
        },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    console.error("Create prescription error:", error);
    res.status(500).json({ success: false, message: "Failed to create prescription." });
  }
}

async function getPrescriptions(req, res) {
  try {
    const { patientId, doctorId, status } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        items: true,
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    console.error("Get prescriptions error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch prescriptions." });
  }
}

async function getPrescriptionById(req, res) {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: { items: true, patient: true, doctor: true },
    });
    if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found." });
    res.json({ success: true, data: prescription });
  } catch (error) {
    console.error("Get prescription error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch prescription." });
  }
}

async function updatePrescriptionStatus(req, res) {
  try {
    const { status } = req.body;
    const prescription = await prisma.prescription.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: prescription });
  } catch (error) {
    console.error("Update prescription error:", error);
    res.status(500).json({ success: false, message: "Failed to update prescription." });
  }
}

module.exports = { createPrescription, getPrescriptions, getPrescriptionById, updatePrescriptionStatus };
