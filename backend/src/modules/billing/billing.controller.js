"use strict";

const Razorpay = require("razorpay");
const prisma   = require("../../config/db");
const { writeAuditLog } = require("../../security/audit");

const _ok  = (res, data, msg = "Success", s = 200) => res.status(s).json({ success: true, message: msg, data });
const _err = (res, s, msg) => res.status(s).json({ success: false, message: msg });

// Lazy Razorpay instance
let _razorpay = null;
function getRazorpay() {
  if (_razorpay) return _razorpay;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("[billing] RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env");
  }
  _razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return _razorpay;
}

// Invoice number generator: HMS-YYYY-XXXXXX
async function _genInvoiceNumber(tx) {
  const year   = new Date().getFullYear();
  const prefix = `HMS-${year}-`;
  const last   = await tx.bill.findFirst({
    where:   { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select:  { invoiceNumber: true },
  });
  const next = last
    ? parseInt(last.invoiceNumber.replace(prefix, "")) + 1
    : 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

// ─── GET /api/billing/patient/:patientId ─────────────────────────────────────
// Smart aggregator: pull all charges from Lab, Pharmacy, Consultation tables
async function getPatientCharges(req, res) {
  const { patientId } = req.params;

  try {
    const [labReports, dispenses, appointments, existingBills] = await Promise.all([

      // Lab charges — completed reports without a bill item yet
      prisma.labReport.findMany({
        where: { patientId, isDeleted: false, status: "COMPLETED" },
        select: { id: true, testName: true, testDate: true, createdAt: true },
      }),

      // Pharmacy charges — dispense logs for this patient
      prisma.dispenseLog.findMany({
        where:   { patientId },
        include: { medicine: { select: { name: true, sellingPrice: true } } },
      }),

      // Consultation charges — completed appointments
      prisma.appointment.findMany({
        where:   { patientId, isDeleted: false, status: "COMPLETED" },
        include: { doctor: { select: { consultationFee: true, firstName: true, lastName: true } } },
      }),

      // Existing bills (to compute outstanding balance)
      prisma.bill.findMany({
        where:   { patientId, isDeleted: false },
        include: { items: true, payments: true },
        orderBy: { generatedAt: "desc" },
      }),
    ]);

    // Build itemized charge list
    const lineItems = [];

    labReports.forEach(lr => {
      lineItems.push({
        source:      "LAB",
        referenceId: lr.id,
        description: `Lab Test: ${lr.testName}`,
        category:    "LAB_TEST",
        quantity:    1,
        unitPrice:   0,           // price set by billing staff at bill creation
        testDate:    lr.testDate,
      });
    });

    dispenses.forEach(d => {
      lineItems.push({
        source:      "PHARMACY",
        referenceId: d.id,
        description: `Medicine: ${d.medicine?.name || "Unknown"}`,
        category:    "MEDICINE",
        quantity:    d.quantity,
        unitPrice:   Number(d.unitPrice),
        totalPrice:  Number(d.totalPrice),
        dispensedAt: d.dispensedAt,
      });
    });

    appointments.forEach(a => {
      lineItems.push({
        source:      "CONSULTATION",
        referenceId: a.id,
        description: `Consultation: Dr. ${a.doctor?.firstName || ""} ${a.doctor?.lastName || ""}`,
        category:    "CONSULTATION",
        quantity:    1,
        unitPrice:   Number(a.doctor?.consultationFee || 0),
        totalPrice:  Number(a.doctor?.consultationFee || 0),
        scheduledAt: a.scheduledAt,
      });
    });

    const totalOutstanding = existingBills.reduce((sum, b) => {
      return sum + (Number(b.totalAmount) - Number(b.paidAmount));
    }, 0);

    return _ok(res, { lineItems, existingBills, summary: { totalOutstanding } });
  } catch (err) {
    console.error("[billing] getPatientCharges:", err);
    return _err(res, 500, "Failed to aggregate charges.");
  }
}

// ─── POST /api/billing/bills ──────────────────────────────────────────────────
// Create Bill with auto-calculated total from provided line items
async function createBill(req, res) {
  const { patientId, admissionId, items = [], discountAmount = 0, discountReason } = req.body;

  if (!patientId || !items.length) {
    return _err(res, 422, "patientId and at least one bill item are required.");
  }

  try {
    const bill = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await _genInvoiceNumber(tx);

      const totalAmount = items.reduce(
        (sum, item) => sum + (item.unitPrice * (item.quantity || 1)),
        0
      );
      const finalTotal = Math.max(0, totalAmount - discountAmount);

      return tx.bill.create({
        data: {
          patientId,
          admissionId:     admissionId     || null,
          invoiceNumber,
          totalAmount:     finalTotal,
          paidAmount:      0,
          discountAmount,
          discountReason:  discountReason  || null,
          status:          "PENDING",
          generatedBy:     req.user.id,
          items: {
            create: items.map(item => ({
              description: item.description,
              category:    item.category || "OTHER",
              quantity:    item.quantity || 1,
              unitPrice:   item.unitPrice,
              totalPrice:  item.unitPrice * (item.quantity || 1),
              referenceId: item.referenceId || null,
            })),
          },
        },
        include: { items: true },
      });
    });

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "CREATE", resource: "Bill", resourceId: bill.id,
      ipAddress: req.ip, details: { invoiceNumber: bill.invoiceNumber,
        totalAmount: bill.totalAmount, patientId },
    });

    return _ok(res, bill, "Bill created.", 201);
  } catch (err) {
    console.error("[billing] createBill:", err);
    return _err(res, 500, "Failed to create bill.");
  }
}

// ─── POST /api/billing/payments ───────────────────────────────────────────────
// Record payment, update paidAmount, emit Socket.io on PAID
async function recordPayment(req, res) {
  const { billId, amount, method, transactionId, notes } = req.body;

  if (!billId || !amount || !method) {
    return _err(res, 422, "billId, amount, and method are required.");
  }

  const VALID_METHODS = ["CASH", "UPI", "CARD", "INSURANCE", "NETBANKING"];
  if (!VALID_METHODS.includes(method)) {
    return _err(res, 422, `method must be one of: ${VALID_METHODS.join(", ")}`);
  }

  try {
    const { payment, bill } = await prisma.$transaction(async (tx) => {
      const existing = await tx.bill.findUnique({
        where: { id: billId, isDeleted: false },
        select: { id: true, totalAmount: true, paidAmount: true, status: true, patientId: true },
      });
      if (!existing) { const e = new Error("Bill not found."); e.status = 404; throw e; }
      if (existing.status === "PAID") { const e = new Error("Bill is already fully paid."); e.status = 409; throw e; }

      const newPaid  = Number(existing.paidAmount) + Number(amount);
      const newStatus = newPaid >= Number(existing.totalAmount) ? "PAID"
                      : newPaid > 0 ? "PARTIAL"
                      : "PENDING";

      const [pay, updated] = await Promise.all([
        tx.payment.create({
          data: {
            billId, amount, method,
            transactionId: transactionId || null,
            receivedBy:    req.user.id,
            notes:         notes || null,
          },
        }),
        tx.bill.update({
          where: { id: billId },
          data:  {
            paidAmount: newPaid,
            status:     newStatus,
            ...(newStatus === "PAID" && { paidAt: new Date() }),
          },
        }),
      ]);

      return { payment: pay, bill: updated };
    });

    // Emit Socket.io discharge clearance if fully paid
    if (bill.status === "PAID") {
      const io = req.app.get("io");
      if (io) {
        io.emit("billing:invoice-paid", {
          billId, patientId: bill.patientId,
          totalAmount: bill.totalAmount, paidAt: bill.paidAt,
        });
      }
    }

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "PAYMENT", resource: "Bill", resourceId: billId,
      ipAddress: req.ip, details: { amount, method, billStatus: bill.status },
    });

    return _ok(res, { payment, bill }, `Payment recorded. Bill status: ${bill.status}.`, 201);
  } catch (err) {
    if (err.status) return _err(res, err.status, err.message);
    console.error("[billing] recordPayment:", err);
    return _err(res, 500, "Failed to record payment.");
  }
}

// ─── POST /api/billing/qr ─────────────────────────────────────────────────────
// Generate Razorpay UPI dynamic QR code for a bill
async function generateQR(req, res) {
  const { billId } = req.body;
  if (!billId) return _err(res, 422, "billId is required.");

  try {
    const bill = await prisma.bill.findUnique({
      where:  { id: billId, isDeleted: false },
      select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true },
    });
    if (!bill) return _err(res, 404, "Bill not found.");

    const amountDue = Number(bill.totalAmount) - Number(bill.paidAmount);
    if (amountDue <= 0) return _err(res, 409, "Bill is already fully paid.");

    // Razorpay amount is in paise (smallest INR unit)
    const rzp = getRazorpay();
    const qrCode = await rzp.qrCode.create({
      type:              "upi_qr",
      name:              "ArogyaSeva HMS",
      usage:             "single_use",
      fixed_amount:      true,
      payment_amount:    Math.round(amountDue * 100),
      description:       `Payment for Invoice ${bill.invoiceNumber}`,
      close_by:          Math.floor(Date.now() / 1000) + 1800, // expires in 30 mins
    });

    return _ok(res, {
      qrCodeId:    qrCode.id,
      imageUrl:    qrCode.image_url,
      amountDue,
      invoiceNumber: bill.invoiceNumber,
      expiresIn:   "30 minutes",
    }, "UPI QR code generated.");
  } catch (err) {
    if (err.message?.includes("RAZORPAY")) return _err(res, 503, err.message);
    console.error("[billing] generateQR:", err);
    return _err(res, 500, "Failed to generate QR code.");
  }
}

// ─── GET /api/billing/reconciliation ─────────────────────────────────────────
// Daily revenue breakdown by payment method
async function reconciliation(req, res) {
  const { date } = req.query;
  const day      = date ? new Date(date) : new Date();
  const dayStart = new Date(day.setHours(0, 0, 0, 0));
  const dayEnd   = new Date(day.setHours(23, 59, 59, 999));

  try {
    const payments = await prisma.payment.groupBy({
      by:    ["method"],
      where: { paidAt: { gte: dayStart, lte: dayEnd } },
      _sum:  { amount: true },
      _count: { id: true },
    });

    const totalRevenue = payments.reduce((s, p) => s + Number(p._sum.amount || 0), 0);

    const breakdown = payments.map(p => ({
      method:       p.method,
      totalAmount:  Number(p._sum.amount || 0),
      transactions: p._count.id,
    }));

    // Bill status summary for the day
    const [pending, paid, partial] = await Promise.all([
      prisma.bill.count({ where: { generatedAt: { gte: dayStart, lte: dayEnd }, status: "PENDING" } }),
      prisma.bill.count({ where: { generatedAt: { gte: dayStart, lte: dayEnd }, status: "PAID" } }),
      prisma.bill.count({ where: { generatedAt: { gte: dayStart, lte: dayEnd }, status: "PARTIAL" } }),
    ]);

    return _ok(res, {
      date:         dayStart.toISOString().split("T")[0],
      totalRevenue,
      breakdown,
      billsSummary: { pending, paid, partial },
    });
  } catch (err) {
    console.error("[billing] reconciliation:", err);
    return _err(res, 500, "Failed to fetch reconciliation data.");
  }
}

module.exports = {
  getPatientCharges, createBill, recordPayment,
  generateQR, reconciliation,
};
