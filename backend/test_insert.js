const prisma = require('./src/config/db')
const bcrypt = require('bcryptjs')

async function run() {
  console.log("🚀 Inserting fake patient...")

  const password = await bcrypt.hash("Test@123", 10)

  const patient = await prisma.patient.create({
    data: {
      patientId: "PAT-2024-9999",
      firstName: Buffer.from("Test"),
      lastName: Buffer.from("User"),
      phone: Buffer.from("9999999999"),
      email: Buffer.from("testuser@gmail.com"),
      passwordHash: password,
      dateOfBirth: new Date("2000-01-01"),
      gender: "MALE"
    }
  })

  console.log("✅ Inserted:", patient.patientId)
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())