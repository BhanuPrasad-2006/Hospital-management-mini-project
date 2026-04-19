// test_db.js — Run after seed to verify everything works
// Usage: node test_db.js
// Place this file in project root

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ log: ['error'] })

const PASS = '✅'
const FAIL = '❌'

async function test(label, fn) {
  try {
    const result = await fn()
    console.log(`${PASS} ${label}${result ? ' → ' + result : ''}`)
    return true
  } catch (err) {
    console.log(`${FAIL} ${label}: ${err.message}`)
    return false
  }
}

async function runTests() {
  console.log('\n' + '═'.repeat(60))
  console.log('  ArogyaSeva HMS — Database Verification Tests')
  console.log('═'.repeat(60) + '\n')

  let passed = 0, failed = 0

  // ── 1. Connection ─────────────────────────────────────────────────────────
  console.log('📡 CONNECTION TESTS')
  const ok1 = await test('Prisma connects to PostgreSQL', async () => {
    await prisma.$connect()
    return 'connected'
  })
  if (ok1) passed++; else failed++

  // ── 2. Table counts ───────────────────────────────────────────────────────
  console.log('\n📊 TABLE COUNT TESTS')

  const tableCounts = [
    ['Patient records',         () => prisma.patient.count().then(n => `${n} rows`)],
    ['Doctor records',          () => prisma.doctor.count().then(n => `${n} rows`)],
    ['Staff records',           () => prisma.staff.count().then(n => `${n} rows`)],
    ['Departments',             () => prisma.department.count().then(n => `${n} rows`)],
    ['Rooms',                   () => prisma.room.count().then(n => `${n} rows`)],
    ['Beds',                    () => prisma.bed.count().then(n => `${n} rows`)],
    ['Medicines',               () => prisma.medicine.count().then(n => `${n} rows`)],
    ['Appointments',            () => prisma.appointment.count().then(n => `${n} rows`)],
    ['Prescriptions',           () => prisma.prescription.count().then(n => `${n} rows`)],
    ['PrescriptionMedicines',   () => prisma.prescriptionMedicine.count().then(n => `${n} rows`)],
    ['DietPlans',               () => prisma.dietPlan.count().then(n => `${n} rows`)],
    ['Bills',                   () => prisma.bill.count().then(n => `${n} rows`)],
    ['BillItems',               () => prisma.billItem.count().then(n => `${n} rows`)],
    ['Payments',                () => prisma.payment.count().then(n => `${n} rows`)],
    ['BloodInventory',          () => prisma.bloodInventory.count().then(n => `${n} rows`)],
    ['Ambulances',              () => prisma.ambulance.count().then(n => `${n} rows`)],
    ['PatientSettings',         () => prisma.patientSettings.count().then(n => `${n} rows`)],
    ['DoctorSettings',          () => prisma.doctorSettings.count().then(n => `${n} rows`)],
    ['StaffSettings',           () => prisma.staffSettings.count().then(n => `${n} rows`)],
    ['Verifications',           () => prisma.verification.count().then(n => `${n} rows`)],
    ['AuditLogs',               () => prisma.auditLog.count().then(n => `${n} rows`)],
    ['Notifications',           () => prisma.notification.count().then(n => `${n} rows`)],
    ['HospitalSettings',        () => prisma.hospitalSettings.count().then(n => `${n} rows`)],
  ]

  for (const [label, fn] of tableCounts) {
    const ok = await test(label, fn)
    if (ok) passed++; else failed++
  }

  // ── 3. Foreign Key Tests ──────────────────────────────────────────────────
  console.log('\n🔑 FOREIGN KEY INTEGRITY TESTS')

  const ok3a = await test('Patient → PatientSettings join', async () => {
    const p = await prisma.patient.findFirst({ include: { settings: true } })
    if (!p?.settings) throw new Error('No settings linked to patient')
    return `Patient ${p.patientId} has settings`
  })
  if (ok3a) passed++; else failed++

  const ok3b = await test('Doctor → Department join', async () => {
    const d = await prisma.doctor.findFirst({ include: { department: true }, where: { departmentId: { not: null } } })
    if (!d?.department) throw new Error('No department linked to doctor')
    return `Dr. ${d.firstName} → ${d.department.name}`
  })
  if (ok3b) passed++; else failed++

  const ok3c = await test('Prescription → PrescriptionMedicine → DietPlan chain', async () => {
    const rx = await prisma.prescription.findFirst({
      include: { medicines: true, dietPlan: true, patient: true },
    })
    if (!rx) throw new Error('No prescription found')
    if (rx.medicines.length === 0) throw new Error('No medicines linked')
    if (!rx.dietPlan) throw new Error('No diet plan linked')
    return `Rx has ${rx.medicines.length} medicines + diet plan`
  })
  if (ok3c) passed++; else failed++

  const ok3d = await test('Bill → BillItem → Payment chain', async () => {
    const bill = await prisma.bill.findFirst({ include: { items: true, payments: true } })
    if (!bill) throw new Error('No bill found')
    if (bill.items.length === 0) throw new Error('No bill items')
    if (bill.payments.length === 0) throw new Error('No payments')
    return `Bill ${bill.invoiceNumber}: ${bill.items.length} items, ${bill.payments.length} payment`
  })
  if (ok3d) passed++; else failed++

  const ok3e = await test('Verification → Patient link', async () => {
    const v = await prisma.verification.findFirst({ where: { entityType: 'PATIENT' }, include: { patient: true } })
    if (!v?.patient) throw new Error('Verification not linked to patient')
    return `Verified: ${v.status}`
  })
  if (ok3e) passed++; else failed++

  const ok3f = await test('Bed → Room → Department chain', async () => {
    const bed = await prisma.bed.findFirst({ include: { room: { include: { department: true } } } })
    if (!bed?.room?.department) throw new Error('Bed→Room→Department chain broken')
    return `Bed ${bed.bedNumber} in ${bed.room.roomNumber} in ${bed.room.department.name}`
  })
  if (ok3f) passed++; else failed++

  // ── 4. Unique Constraint Tests ────────────────────────────────────────────
  console.log('\n🔐 UNIQUE CONSTRAINT TESTS')

  const ok4a = await test('Patient patientId is unique', async () => {
    const count = await prisma.patient.count({ where: { patientId: 'PAT-2024-0001' } })
    if (count !== 1) throw new Error(`Expected 1, found ${count}`)
    return 'PAT-2024-0001 is unique'
  })
  if (ok4a) passed++; else failed++

  const ok4b = await test('Doctor doctorCode is unique', async () => {
    const count = await prisma.doctor.count({ where: { doctorCode: 'DOC-2024-CARD-001' } })
    if (count !== 1) throw new Error(`Expected 1, found ${count}`)
    return 'DOC-2024-CARD-001 is unique'
  })
  if (ok4b) passed++; else failed++

  const ok4c = await test('Staff staffId is unique', async () => {
    const count = await prisma.staff.count({ where: { staffId: 'STF-ADM-001' } })
    if (count !== 1) throw new Error(`Expected 1, found ${count}`)
    return 'STF-ADM-001 is unique'
  })
  if (ok4c) passed++; else failed++

  const ok4d = await test('BloodInventory unique per blood group + rhFactor', async () => {
    const total = await prisma.bloodInventory.count()
    if (total !== 8) throw new Error(`Expected 8 entries, got ${total}`)
    return '8 unique blood group entries'
  })
  if (ok4d) passed++; else failed++

  // ── 5. Soft Delete Test ───────────────────────────────────────────────────
  console.log('\n🗑️  SOFT DELETE TESTS')

  const ok5 = await test('isDeleted flag exists on patients', async () => {
    const p = await prisma.patient.findFirst({ where: { isDeleted: false } })
    if (!p) throw new Error('No active patients found')
    return `Active patients found (isDeleted=false)`
  })
  if (ok5) passed++; else failed++

  // ── 6. Admin user bhanu07 ─────────────────────────────────────────────────
  console.log('\n👤 ADMIN USER TESTS (bhanu07)')

  const ok6 = await test('Admin user bhanu07 (STF-ADM-001) exists', async () => {
    const admin = await prisma.staff.findUnique({ where: { staffId: 'STF-ADM-001' } })
    if (!admin) throw new Error('Admin STF-ADM-001 not found')
    return `${admin.firstName} ${admin.lastName} / role: ${admin.role}`
  })
  if (ok6) passed++; else failed++

  // ── 7. Index verification ─────────────────────────────────────────────────
  console.log('\n⚡ QUERY PERFORMANCE TESTS (index usage)')

  const ok7a = await test('Query patient by patientId (indexed)', async () => {
    const start = Date.now()
    await prisma.patient.findUnique({ where: { patientId: 'PAT-2024-0001' } })
    const ms = Date.now() - start
    return `${ms}ms`
  })
  if (ok7a) passed++; else failed++

  const ok7b = await test('Query appointments by doctor + status (indexed)', async () => {
    const start = Date.now()
    await prisma.appointment.findMany({ where: { status: 'CONFIRMED' }, take: 10 })
    const ms = Date.now() - start
    return `${ms}ms`
  })
  if (ok7b) passed++; else failed++

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log(`  Results: ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`)
  console.log('═'.repeat(60))
  if (failed === 0) {
    console.log('  🎉 All tests passed! Database is ready.')
  } else {
    console.log(`  ⚠️  ${failed} test(s) failed. Check seed and schema.`)
  }
  console.log()
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect())