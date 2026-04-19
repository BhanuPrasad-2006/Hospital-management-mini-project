const prisma = require('./src/config/db')
const bcrypt = require('bcryptjs')

async function run() {
  console.log("🚀 Inserting bulk test data...")

  const password = await bcrypt.hash("Test@123", 10)

  // ─── Create Patient ───
  const patient = await prisma.patient.create({
    data: {
      patientId: "PAT-2024-9001",
      firstName: Buffer.from("Rahul"),
      lastName: Buffer.from("Verma"),
      phone: Buffer.from("8888888888"),
      email: Buffer.from("rahul@test.com"),
      passwordHash: password,
      dateOfBirth: new Date("1995-05-10"),
      gender: "MALE"
    }
  })

  // ─── Create Doctor ───
  const doctor = await prisma.doctor.create({
    data: {
      doctorCode: "DOC-2024-GEN-999",
      firstName: "Test",
      lastName: "Doctor",
      specialization: "General Medicine",
      licenseNumber: "TEST-LIC-999",
      consultationFee: 300,
      phone: Buffer.from("7777777777"),
      passwordHash: password
    }
  })

  // ─── Create Appointment ───
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      scheduledAt: new Date(),
      status: "CONFIRMED",
      reason: "Testing full flow"
    }
  })

  // ─── Create Prescription ───
  const prescription = await prisma.prescription.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600000)
    }
  })

  // ─── Medicine ───
  const medicine = await prisma.medicine.findFirst()

  // ─── Bill ───
  const bill = await prisma.bill.create({
    data: {
      patientId: patient.id,
      invoiceNumber: "HMS-TEST-999",
      totalAmount: 500,
      status: "PENDING"
    }
  })

  // ─── Bill Item ───
  await prisma.billItem.create({
    data: {
      billId: bill.id,
      description: "Test consultation",
      category: "CONSULTATION",
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500
    }
  })

  console.log("✅ Bulk data inserted successfully")
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())