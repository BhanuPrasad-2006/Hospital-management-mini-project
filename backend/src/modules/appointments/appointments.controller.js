/**
 * Appointments Module — Controller
 */

const prisma = require("../../config/db");

async function createAppointment(req, res) {
  try {
    const { patientId, doctorId, dateTime, duration, reason } = req.body;

    // Check for scheduling conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        dateTime: {
          gte: new Date(new Date(dateTime).getTime() - (duration || 30) * 60000),
          lte: new Date(new Date(dateTime).getTime() + (duration || 30) * 60000),
        },
      },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "Doctor has a scheduling conflict at this time.",
      });
    }

    const appointment = await prisma.appointment.create({
      data: { patientId, doctorId, dateTime: new Date(dateTime), duration: duration || 30, reason },
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({ success: false, message: "Failed to create appointment." });
  }
}

async function getAllAppointments(req, res) {
  try {
    const { status, doctorId, patientId, date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (date) {
      const d = new Date(date);
      where.dateTime = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
      orderBy: { dateTime: "asc" },
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch appointments." });
  }
}

async function updateAppointmentStatus(req, res) {
  try {
    const { status, notes } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status, notes },
    });

    res.json({ success: true, data: appointment });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({ success: false, message: "Failed to update appointment." });
  }
}

async function cancelAppointment(req, res) {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });
    res.json({ success: true, data: appointment });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel appointment." });
  }
}

module.exports = { createAppointment, getAllAppointments, updateAppointmentStatus, cancelAppointment };
