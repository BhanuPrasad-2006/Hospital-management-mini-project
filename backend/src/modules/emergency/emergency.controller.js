/**
 * Emergency Module — Controller (SOS Ambulance Dispatch)
 */

const prisma = require("../../config/db");

async function createEmergency(req, res) {
  try {
    const { patientId, callerName, callerPhone, location, description, priority } = req.body;

    const emergency = await prisma.emergency.create({
      data: {
        patientId: patientId || null,
        callerName,
        callerPhone,
        location,
        description,
        priority: priority || "HIGH",
      },
    });

    res.status(201).json({ success: true, data: emergency });
  } catch (error) {
    console.error("Create emergency error:", error);
    res.status(500).json({ success: false, message: "Failed to create emergency." });
  }
}

async function getEmergencies(req, res) {
  try {
    const { resolved, priority } = req.query;
    const where = {};
    if (resolved !== undefined) where.isResolved = resolved === "true";
    if (priority) where.priority = priority;

    const emergencies = await prisma.emergency.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    res.json({ success: true, data: emergencies });
  } catch (error) {
    console.error("Get emergencies error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch emergencies." });
  }
}

async function dispatchAmbulance(req, res) {
  try {
    const emergency = await prisma.emergency.update({
      where: { id: req.params.id },
      data: { dispatchedAt: new Date() },
    });
    res.json({ success: true, data: emergency, message: "Ambulance dispatched." });
  } catch (error) {
    console.error("Dispatch error:", error);
    res.status(500).json({ success: false, message: "Failed to dispatch ambulance." });
  }
}

async function resolveEmergency(req, res) {
  try {
    const emergency = await prisma.emergency.update({
      where: { id: req.params.id },
      data: { isResolved: true, resolvedAt: new Date() },
    });
    res.json({ success: true, data: emergency });
  } catch (error) {
    console.error("Resolve emergency error:", error);
    res.status(500).json({ success: false, message: "Failed to resolve emergency." });
  }
}

module.exports = { createEmergency, getEmergencies, dispatchAmbulance, resolveEmergency };
