/**
 * Billing Module — Controller
 */

const prisma = require("../../config/db");

async function createBill(req, res) {
  try {
    const { patientId, items, dueDate, notes } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const bill = await prisma.bill.create({
      data: {
        patientId,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    console.error("Create bill error:", error);
    res.status(500).json({ success: false, message: "Failed to create bill." });
  }
}

async function getBills(req, res) {
  try {
    const { patientId, status } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const bills = await prisma.bill.findMany({
      where,
      include: {
        items: true,
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: bills });
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bills." });
  }
}

async function recordPayment(req, res) {
  try {
    const { amount } = req.body;
    const bill = await prisma.bill.findUnique({ where: { id: req.params.id } });

    if (!bill) return res.status(404).json({ success: false, message: "Bill not found." });

    const newPaid = bill.paidAmount + amount;
    const newStatus = newPaid >= bill.totalAmount ? "PAID" : "PARTIALLY_PAID";

    const updated = await prisma.bill.update({
      where: { id: req.params.id },
      data: { paidAmount: newPaid, status: newStatus },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Record payment error:", error);
    res.status(500).json({ success: false, message: "Failed to record payment." });
  }
}

module.exports = { createBill, getBills, recordPayment };
