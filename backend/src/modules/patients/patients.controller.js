/**
 * Patients Module — Controller
 */

const prisma = require("../../config/db");
const { encrypt, decrypt } = require("../../security/encrypt");

async function getAllPatients(req, res) {
  try {
    const patients = await prisma.patient.findMany({
      include: { user: { select: { email: true, role: true, isActive: true } } },
      orderBy: { lastName: "asc" },
    });

    // Decrypt sensitive fields before sending
    const decrypted = patients.map((p) => ({
      ...p,
      insuranceId: p.insuranceId ? decrypt(p.insuranceId) : null,
    }));

    res.json({ success: true, data: decrypted });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch patients." });
  }
}

async function getPatientById(req, res) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true, role: true } },
        appointments: { orderBy: { dateTime: "desc" }, take: 10 },
        prescriptions: { orderBy: { createdAt: "desc" }, take: 10 },
        bills: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    // Decrypt sensitive fields
    patient.insuranceId = patient.insuranceId ? decrypt(patient.insuranceId) : null;

    res.json({ success: true, data: patient });
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch patient." });
  }
}

async function updatePatient(req, res) {
  try {
    const { firstName, lastName, phone, address, bloodGroup, emergencyContact, insuranceId, allergies } = req.body;

    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (phone) data.phone = phone;
    if (address) data.address = address;
    if (bloodGroup) data.bloodGroup = bloodGroup;
    if (emergencyContact) data.emergencyContact = emergencyContact;
    if (allergies) data.allergies = allergies;
    // Encrypt sensitive data before storing
    if (insuranceId) data.insuranceId = encrypt(insuranceId);

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: patient });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({ success: false, message: "Failed to update patient." });
  }
}

async function deletePatient(req, res) {
  try {
    await prisma.patient.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Patient deleted." });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({ success: false, message: "Failed to delete patient." });
  }
}

module.exports = { getAllPatients, getPatientById, updatePatient, deletePatient };
