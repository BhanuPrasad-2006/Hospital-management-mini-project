// database/seed.js
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ArogyaSeva HMS — Database Seed Script                                   ║
// ║  Run: node database/seed.js  (from project root, after prisma migrate)   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const prisma = new PrismaClient()

// ─── Encryption (mirrors backend/src/security/encrypt.js) ───────────────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'arogyaseva-dev-key-32-chars!!!!!!'  // 32 chars
const IV_LENGTH = 16

function encrypt(text) {
  if (!text) return null
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  )
  let encrypted = cipher.update(text.toString(), 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return Buffer.from(iv.toString('hex') + ':' + encrypted.toString('hex'))
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Starting ArogyaSeva HMS database seed...\n')

  // ── 1. Hospital Settings ───────────────────────────────────────────────────
  console.log('📋 Seeding hospital settings...')
  await prisma.hospitalSettings.upsert({
    where: { id: 'hospital-main' },
    update: {},
    create: {
      id:                'hospital-main',
      hospitalName:      'ArogyaSeva Hospital',
      address:           '123 Health Street, Koramangala',
      city:              'Bengaluru',
      state:             'Karnataka',
      pincode:           '560034',
      phone:             '+91-80-12345678',
      emergencyPhone:    '108',
      email:             'admin@arogyaseva.in',
      website:           'https://arogyaseva.in',
      workingHoursStart: '08:00',
      workingHoursEnd:   '20:00',
      workingDays:       ['MON','TUE','WED','THU','FRI','SAT'],
      registrationNo:    'KARN-HOSP-2024-001',
      timezone:          'Asia/Kolkata',
      currency:          'INR',
    },
  })

  // ── 2. Departments ─────────────────────────────────────────────────────────
  console.log('🏥 Seeding departments...')
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: 'General Medicine' },
      update: {},
      create: { name: 'General Medicine', floor: 1, totalBeds: 20, phone: '101' },
    }),
    prisma.department.upsert({
      where: { name: 'Cardiology' },
      update: {},
      create: { name: 'Cardiology', floor: 2, totalBeds: 10, phone: '201' },
    }),
    prisma.department.upsert({
      where: { name: 'Neurology' },
      update: {},
      create: { name: 'Neurology', floor: 2, totalBeds: 8, phone: '202' },
    }),
    prisma.department.upsert({
      where: { name: 'Pediatrics' },
      update: {},
      create: { name: 'Pediatrics', floor: 3, totalBeds: 15, phone: '301' },
    }),
    prisma.department.upsert({
      where: { name: 'Emergency' },
      update: {},
      create: { name: 'Emergency', floor: 0, totalBeds: 10, phone: '100' },
    }),
    prisma.department.upsert({
      where: { name: 'Pharmacy' },
      update: {},
      create: { name: 'Pharmacy', floor: 0, totalBeds: 0, phone: '102' },
    }),
  ])
  const [deptGenMed, deptCardio, deptNeuro, deptPeds, deptEmergency] = departments

  // ── 3. Rooms ───────────────────────────────────────────────────────────────
  console.log('🛏️  Seeding rooms and beds...')
  const room1 = await prisma.room.upsert({
    where: { roomNumber: 'GM-101' },
    update: {},
    create: { roomNumber: 'GM-101', floor: 1, type: 'GENERAL', departmentId: deptGenMed.id, totalBeds: 4 },
  })
  const room2 = await prisma.room.upsert({
    where: { roomNumber: 'CARD-201' },
    update: {},
    create: { roomNumber: 'CARD-201', floor: 2, type: 'PRIVATE', departmentId: deptCardio.id, totalBeds: 2 },
  })
  const roomICU = await prisma.room.upsert({
    where: { roomNumber: 'ICU-001' },
    update: {},
    create: { roomNumber: 'ICU-001', floor: 1, type: 'ICU', departmentId: deptEmergency.id, totalBeds: 3 },
  })

  // ── 4. Beds ────────────────────────────────────────────────────────────────
  const beds = []
  for (let i = 1; i <= 4; i++) {
    const bed = await prisma.bed.upsert({
      where: { bedNumber_roomId: { bedNumber: `B-${i}`, roomId: room1.id } },
      update: {},
      create: { bedNumber: `B-${i}`, roomId: room1.id, status: i <= 2 ? 'OCCUPIED' : 'AVAILABLE' },
    })
    beds.push(bed)
  }
  const bedCard1 = await prisma.bed.upsert({
    where: { bedNumber_roomId: { bedNumber: 'C-1', roomId: room2.id } },
    update: {},
    create: { bedNumber: 'C-1', roomId: room2.id, status: 'AVAILABLE' },
  })

  // ── 5. Doctors ─────────────────────────────────────────────────────────────
  console.log('👨‍⚕️  Seeding doctors...')
  const doctorPassword = await hashPassword('Doctor@123')

  const doctorCardio = await prisma.doctor.upsert({
    where: { doctorCode: 'DOC-2024-CARD-001' },
    update: {},
    create: {
      doctorCode:      'DOC-2024-CARD-001',
      firstName:       'Anil',
      lastName:        'Sharma',
      specialization:  'Cardiology',
      licenseNumber:   'KMC-CARD-2010-001',
      qualifications:  ['MBBS', 'MD', 'DM (Cardiology)'],
      experienceYears: 14,
      consultationFee: 500,
      availableDays:   ['MON','TUE','WED','THU','FRI'],
      availableFrom:   '09:00',
      availableTo:     '17:00',
      phone:           encrypt('+91-9876500001'),
      email:           encrypt('anil.sharma@arogyaseva.in'),
      passwordHash:    doctorPassword,
      departmentId:    deptCardio.id,
      rating:          4.8,
    },
  })

  const doctorNeuro = await prisma.doctor.upsert({
    where: { doctorCode: 'DOC-2024-NEUR-001' },
    update: {},
    create: {
      doctorCode:      'DOC-2024-NEUR-001',
      firstName:       'Priya',
      lastName:        'Rao',
      specialization:  'Neurology',
      licenseNumber:   'KMC-NEUR-2015-002',
      qualifications:  ['MBBS', 'MD', 'DM (Neurology)'],
      experienceYears: 9,
      consultationFee: 600,
      availableDays:   ['MON','WED','FRI'],
      availableFrom:   '10:00',
      availableTo:     '16:00',
      phone:           encrypt('+91-9876500002'),
      email:           encrypt('priya.rao@arogyaseva.in'),
      passwordHash:    doctorPassword,
      departmentId:    deptNeuro.id,
      rating:          4.9,
    },
  })

  const doctorPeds = await prisma.doctor.upsert({
    where: { doctorCode: 'DOC-2024-PEDS-001' },
    update: {},
    create: {
      doctorCode:      'DOC-2024-PEDS-001',
      firstName:       'Meena',
      lastName:        'Iyer',
      specialization:  'Pediatrics',
      licenseNumber:   'KMC-PEDS-2018-003',
      qualifications:  ['MBBS', 'MD (Pediatrics)'],
      experienceYears: 6,
      consultationFee: 400,
      availableDays:   ['MON','TUE','WED','THU','FRI','SAT'],
      availableFrom:   '09:00',
      availableTo:     '18:00',
      phone:           encrypt('+91-9876500003'),
      email:           encrypt('meena.iyer@arogyaseva.in'),
      passwordHash:    doctorPassword,
      departmentId:    deptPeds.id,
      rating:          4.7,
    },
  })

  // Doctor settings
  for (const doc of [doctorCardio, doctorNeuro, doctorPeds]) {
    await prisma.doctorSettings.upsert({
      where: { doctorId: doc.id },
      update: {},
      create: { doctorId: doc.id, preferredLanguage: 'en' },
    })
    await prisma.verification.upsert({
      where: { doctorId: doc.id },
      update: {},
      create: {
        entityType:     'DOCTOR',
        doctorId:       doc.id,
        specialization: doc.specialization,
        licenseNumber:  doc.licenseNumber,
        status:         'APPROVED',
        isVerified:     true,
        verifiedAt:     new Date('2024-01-15'),
        verifiedBy:     'system-seed',
        notes:          'Verified during initial system setup',
      },
    })
  }

  // ── 6. Staff ───────────────────────────────────────────────────────────────
  console.log('👷 Seeding staff...')
  const staffPassword = await hashPassword('Staff@123')

  const admin = await prisma.staff.upsert({
    where: { staffId: 'STF-ADM-001' },
    update: {},
    create: {
      staffId:      'STF-ADM-001',
      firstName:    'Bhanu',
      lastName:     'Prasad',
      role:         'ADMIN',
      phone:        encrypt('+91-9876500100'),
      email:        encrypt('bhanu@arogyaseva.in'),
      passwordHash: await hashPassword('Bhanu@2024!'),  // special password for bhanu07
      joiningDate:  new Date('2024-01-01'),
    },
  })

  const nurse = await prisma.staff.upsert({
    where: { staffId: 'STF-NRS-001' },
    update: {},
    create: {
      staffId:      'STF-NRS-001',
      firstName:    'Savitha',
      lastName:     'Nair',
      role:         'NURSE',
      departmentId: deptGenMed.id,
      phone:        encrypt('+91-9876500101'),
      email:        encrypt('savitha.nair@arogyaseva.in'),
      passwordHash: staffPassword,
      joiningDate:  new Date('2024-02-01'),
    },
  })

  const pharmacist = await prisma.staff.upsert({
    where: { staffId: 'STF-PHR-001' },
    update: {},
    create: {
      staffId:      'STF-PHR-001',
      firstName:    'Ravi',
      lastName:     'Kumar',
      role:         'PHARMACIST',
      departmentId: departments[5].id,
      phone:        encrypt('+91-9876500102'),
      email:        encrypt('ravi.kumar@arogyaseva.in'),
      passwordHash: staffPassword,
      joiningDate:  new Date('2024-02-15'),
    },
  })

  const labTech = await prisma.staff.upsert({
    where: { staffId: 'STF-LAB-001' },
    update: {},
    create: {
      staffId:      'STF-LAB-001',
      firstName:    'Anitha',
      lastName:     'Reddy',
      role:         'LAB_TECHNICIAN',
      phone:        encrypt('+91-9876500103'),
      email:        encrypt('anitha.reddy@arogyaseva.in'),
      passwordHash: staffPassword,
    },
  })

  const accountant = await prisma.staff.upsert({
    where: { staffId: 'STF-ACC-001' },
    update: {},
    create: {
      staffId:      'STF-ACC-001',
      firstName:    'Suresh',
      lastName:     'Patel',
      role:         'ACCOUNTANT',
      phone:        encrypt('+91-9876500104'),
      email:        encrypt('suresh.patel@arogyaseva.in'),
      passwordHash: staffPassword,
    },
  })

  // Staff settings + verifications
  for (const s of [admin, nurse, pharmacist, labTech, accountant]) {
    await prisma.staffSettings.upsert({
      where: { staffId: s.id },
      update: {},
      create: { staffId: s.id },
    })
    await prisma.verification.upsert({
      where: { staffId: s.id },
      update: {},
      create: {
        entityType: 'STAFF',
        staffId:    s.id,
        jobRole:    s.role,
        status:     'APPROVED',
        isVerified: true,
        verifiedAt: new Date('2024-01-15'),
        verifiedBy: 'system-seed',
      },
    })
  }

  // ── 7. Patients ────────────────────────────────────────────────────────────
  console.log('👤 Seeding patients...')
  const patientPassword = await hashPassword('Patient@123')

  const patient1 = await prisma.patient.upsert({
    where: { patientId: 'PAT-2024-0001' },
    update: {},
    create: {
      patientId:         'PAT-2024-0001',
      firstName:         encrypt('Ramesh'),
      lastName:          encrypt('Kumar'),
      phone:             encrypt('9876543210'),
      email:             encrypt('ramesh.kumar@gmail.com'),
      passwordHash:      patientPassword,
      dateOfBirth:       new Date('1978-05-14'),
      gender:            'MALE',
      bloodGroup:        'O_POS',
      allergies:         ['Penicillin'],
      chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
    },
  })

  const patient2 = await prisma.patient.upsert({
    where: { patientId: 'PAT-2024-0002' },
    update: {},
    create: {
      patientId:         'PAT-2024-0002',
      firstName:         encrypt('Sunita'),
      lastName:          encrypt('Sharma'),
      phone:             encrypt('9876543211'),
      email:             encrypt('sunita.sharma@gmail.com'),
      passwordHash:      patientPassword,
      dateOfBirth:       new Date('1990-11-22'),
      gender:            'FEMALE',
      bloodGroup:        'A_POS',
      allergies:         [],
      chronicConditions: [],
    },
  })

  const patient3 = await prisma.patient.upsert({
    where: { patientId: 'PAT-2024-0003' },
    update: {},
    create: {
      patientId:    'PAT-2024-0003',
      firstName:    encrypt('Arjun'),
      lastName:     encrypt('Reddy'),
      phone:        encrypt('9876543212'),
      passwordHash: patientPassword,
      dateOfBirth:  new Date('2015-03-08'),
      gender:       'MALE',
      bloodGroup:   'B_POS',
      allergies:    [],
    },
  })

  // Patient settings
  for (const p of [patient1, patient2, patient3]) {
    await prisma.patientSettings.upsert({
      where: { patientId: p.id },
      update: {},
      create: { patientId: p.id, preferredLanguage: 'en' },
    })
    await prisma.verification.upsert({
      where: { patientId: p.id },
      update: {},
      create: {
        entityType: 'PATIENT',
        patientId:  p.id,
        status:     'APPROVED',
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: 'system-seed',
      },
    })
  }

  // Patient history
  await prisma.patientHistory.upsert({
    where: { id: 'hist-001' },
    update: {},
    create: {
      id:          'hist-001',
      patientId:   patient1.id,
      visitDate:   new Date('2023-06-10'),
      diagnosis:   'Hypertension Stage 2',
      treatment:   'Amlodipine 5mg OD',
      hospitalName:'City General Hospital, Bengaluru',
      doctorName:  'Dr. R. Mehta',
    },
  })

  // ── 8. Medicines ───────────────────────────────────────────────────────────
  console.log('💊 Seeding medicines...')
  const medicines = [
    { name:'Metformin 500mg',    genericName:'Metformin HCl',           category:'Antidiabetic', unit:'tablet', stockUnits:500, reorderLevel:50, unitPrice: 2.50, sellingPrice: 3.50 },
    { name:'Amlodipine 5mg',     genericName:'Amlodipine besylate',     category:'Antihypertensive', unit:'tablet', stockUnits:300, reorderLevel:30, unitPrice: 3.00, sellingPrice: 4.50 },
    { name:'Pantoprazole 40mg',  genericName:'Pantoprazole sodium',     category:'Antacid/PPI',   unit:'tablet', stockUnits:200, reorderLevel:20, unitPrice: 4.00, sellingPrice: 6.00 },
    { name:'Paracetamol 500mg',  genericName:'Paracetamol',             category:'Analgesic',     unit:'tablet', stockUnits:1000, reorderLevel:100, unitPrice: 0.50, sellingPrice: 1.00 },
    { name:'Azithromycin 500mg', genericName:'Azithromycin',            category:'Antibiotic',    unit:'tablet', stockUnits:150, reorderLevel:20, unitPrice:12.00, sellingPrice:18.00 },
    { name:'Atorvastatin 10mg',  genericName:'Atorvastatin calcium',    category:'Statin',        unit:'tablet', stockUnits:400, reorderLevel:40, unitPrice: 5.00, sellingPrice: 8.00 },
    { name:'Cetirizine 10mg',    genericName:'Cetirizine HCl',          category:'Antihistamine', unit:'tablet', stockUnits:200, reorderLevel:25, unitPrice: 1.50, sellingPrice: 2.50 },
    { name:'Calpol Syrup 60ml',  genericName:'Paracetamol suspension',  category:'Analgesic',     unit:'ml',     stockUnits: 80, reorderLevel:15, unitPrice:35.00, sellingPrice:55.00 },
  ]

  const savedMeds = []
  for (const med of medicines) {
    const existing = await prisma.medicine.findFirst({ where: { name: med.name } })
    if (!existing) {
      const m = await prisma.medicine.create({ data: { ...med, batchNumber: `BATCH-2024-${Math.random().toString(36).slice(2,7).toUpperCase()}`, expiryDate: new Date('2026-12-31') } })
      savedMeds.push(m)
    } else {
      savedMeds.push(existing)
    }
  }

  // ── 9. Blood Inventory ─────────────────────────────────────────────────────
  console.log('🩸 Seeding blood inventory...')
  const bloodGroups = [
    { bloodGroup:'A_POS',  rhFactor:'POSITIVE', unitsAvailable:8 },
    { bloodGroup:'A_NEG',  rhFactor:'NEGATIVE', unitsAvailable:3 },
    { bloodGroup:'B_POS',  rhFactor:'POSITIVE', unitsAvailable:6 },
    { bloodGroup:'B_NEG',  rhFactor:'NEGATIVE', unitsAvailable:2 },
    { bloodGroup:'O_POS',  rhFactor:'POSITIVE', unitsAvailable:15 },
    { bloodGroup:'O_NEG',  rhFactor:'NEGATIVE', unitsAvailable:5 },
    { bloodGroup:'AB_POS', rhFactor:'POSITIVE', unitsAvailable:4 },
    { bloodGroup:'AB_NEG', rhFactor:'NEGATIVE', unitsAvailable:1 },
  ]
  for (const inv of bloodGroups) {
    await prisma.bloodInventory.upsert({
      where: { bloodGroup_rhFactor: { bloodGroup: inv.bloodGroup, rhFactor: inv.rhFactor } },
      update: { unitsAvailable: inv.unitsAvailable },
      create: { ...inv, expiryDate: new Date('2024-09-30') },
    })
  }

  // ── 10. Ambulances ─────────────────────────────────────────────────────────
  console.log('🚑 Seeding ambulances...')
  await prisma.ambulance.upsert({
    where: { vehicleNumber: 'KA-01-AB-1234' },
    update: {},
    create: { vehicleNumber:'KA-01-AB-1234', driverName:'Raju Sharma', driverPhone:'+91-9876500200', equipmentType:'ADVANCED', currentLat:12.9716, currentLng:77.5946, status:'AVAILABLE' },
  })
  await prisma.ambulance.upsert({
    where: { vehicleNumber: 'KA-01-AB-5678' },
    update: {},
    create: { vehicleNumber:'KA-01-AB-5678', driverName:'Mohan Das', driverPhone:'+91-9876500201', equipmentType:'ICU', currentLat:12.9352, currentLng:77.6245, status:'AVAILABLE' },
  })

  // ── 11. Appointments ───────────────────────────────────────────────────────
  console.log('📅 Seeding appointments...')
  await prisma.appointment.upsert({
    where: { id: 'appt-001' },
    update: {},
    create: {
      id:          'appt-001',
      patientId:   patient1.id,
      doctorId:    doctorCardio.id,
      scheduledAt: new Date(Date.now() + 24 * 3600000), // tomorrow
      type:        'SCHEDULED',
      status:      'CONFIRMED',
      tokenNumber: 3,
      reason:      'Routine BP checkup and prescription renewal',
    },
  })
  await prisma.appointment.upsert({
    where: { id: 'appt-002' },
    update: {},
    create: {
      id:          'appt-002',
      patientId:   patient3.id,
      doctorId:    doctorPeds.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 3600000),
      type:        'SCHEDULED',
      status:      'PENDING',
      tokenNumber: 1,
      reason:      'Fever and cold — child patient',
    },
  })

  // ── 12. Sample Prescription ────────────────────────────────────────────────
  console.log('📄 Seeding prescriptions...')
  const prescription1 = await prisma.prescription.upsert({
    where: { id: 'rx-001' },
    update: {},
    create: {
      id:          'rx-001',
      patientId:   patient1.id,
      doctorId:    doctorCardio.id,
      isAiScanned: false,
      diagnosis:   'Type 2 Diabetes Mellitus with Hypertension',
      icdCode:     'E11 + I10',
      language:    'en',
      expiresAt:   new Date(Date.now() + 30 * 24 * 3600000),
    },
  })

  await prisma.prescriptionMedicine.upsert({
    where: { id: 'rxm-001' },
    update: {},
    create: {
      id:             'rxm-001',
      prescriptionId: prescription1.id,
      medicineName:   'Metformin',
      genericName:    'Metformin HCl',
      dose:           '500mg',
      frequency:      'BD (Twice daily)',
      timing:         'After meals',
      durationDays:   30,
      purpose:        'Controls blood sugar in Type 2 Diabetes',
      sideEffects:    ['Nausea', 'Loose stools', 'Metallic taste'],
      importantNote:  'Never skip even if sugar is normal',
    },
  })

  await prisma.prescriptionMedicine.upsert({
    where: { id: 'rxm-002' },
    update: {},
    create: {
      id:             'rxm-002',
      prescriptionId: prescription1.id,
      medicineName:   'Amlodipine',
      genericName:    'Amlodipine besylate',
      dose:           '5mg',
      frequency:      'OD (Once daily)',
      timing:         'Morning with or without food',
      durationDays:   30,
      purpose:        'Controls blood pressure',
      sideEffects:    ['Ankle swelling', 'Flushing'],
      importantNote:  'Never stop suddenly',
    },
  })

  await prisma.dietPlan.upsert({
    where: { prescriptionId: prescription1.id },
    update: {},
    create: {
      prescriptionId: prescription1.id,
      patientId:      patient1.id,
      foodsToEat:     ['Bitter gourd','Spinach','Oats','Brown rice','Dal','Fish','Eggs'],
      foodsToAvoid:   ['White rice in excess','Sugar','Sweets','Fried food','Salt in excess','Alcohol'],
      mealTiming:     { breakfast:'7-8 AM (must not skip)', lunch:'1-2 PM', snack:'4-5 PM (light)', dinner:'7-8 PM (light)' },
      hydration:      '2 to 2.5 litres of water daily',
      specialNotes:   'Walk 30-45 minutes after dinner. Check blood sugar before breakfast daily.',
      generatedByAi:  false,
      language:       'en',
    },
  })

  // ── 13. Bill ───────────────────────────────────────────────────────────────
  console.log('💰 Seeding bills...')
  const bill1 = await prisma.bill.upsert({
    where: { invoiceNumber: 'HMS-2024-000001' },
    update: {},
    create: {
      patientId:     patient1.id,
      invoiceNumber: 'HMS-2024-000001',
      totalAmount:   1200.00,
      paidAmount:    1200.00,
      status:        'PAID',
      generatedBy:   accountant.id,
      generatedAt:   new Date('2024-04-01'),
      paidAt:        new Date('2024-04-01'),
    },
  })

  await prisma.billItem.createMany({
    skipDuplicates: true,
    data: [
      { billId: bill1.id, description: 'Consultation — Dr. Anil Sharma', category: 'CONSULTATION', quantity: 1, unitPrice: 500, totalPrice: 500 },
      { billId: bill1.id, description: 'Metformin 500mg × 30',           category: 'MEDICINE',     quantity: 30, unitPrice: 3.50, totalPrice: 105 },
      { billId: bill1.id, description: 'Amlodipine 5mg × 30',            category: 'MEDICINE',     quantity: 30, unitPrice: 4.50, totalPrice: 135 },
      { billId: bill1.id, description: 'HbA1c Blood Test',               category: 'LAB_TEST',     quantity: 1,  unitPrice: 350, totalPrice: 350 },
      { billId: bill1.id, description: 'Lipid Profile',                  category: 'LAB_TEST',     quantity: 1,  unitPrice: 110, totalPrice: 110 },
    ],
  })

  await prisma.payment.upsert({
    where: { id: 'pay-001' },
    update: {},
    create: {
      id:            'pay-001',
      billId:        bill1.id,
      amount:        1200.00,
      method:        'UPI',
      transactionId: 'UPI-2024-PAYTM-ABC123',
      receivedBy:    accountant.id,
      paidAt:        new Date('2024-04-01'),
    },
  })

  // ── 14. Audit Log (initial entries) ───────────────────────────────────────
  console.log('🔐 Seeding initial audit log entries...')
  await prisma.auditLog.createMany({
    data: [
      { userId:'STF-ADM-001', userName:'Bhanu Prasad', userRole:'ADMIN', action:'CREATE', module:'system', ipAddress:'127.0.0.1', newValue:{ event:'Database seeded' }, riskScore:0 },
      { userId:'DOC-2024-CARD-001', userName:'Dr. Anil Sharma', userRole:'DOCTOR', action:'CREATE', module:'prescriptions', recordId:'rx-001', ipAddress:'127.0.0.1', riskScore:0 },
    ],
    skipDuplicates: false,
  })

  // ── 15. Notifications ──────────────────────────────────────────────────────
  console.log('🔔 Seeding notifications...')
  await prisma.notification.createMany({
    data: [
      { userId:'PAT-2024-0001', userType:'PATIENT', title:'Appointment Confirmed', message:'Your appointment with Dr. Anil Sharma is confirmed for tomorrow at 10:00 AM.', type:'APPOINTMENT' },
      { userId:'PAT-2024-0001', userType:'PATIENT', title:'Medicine Reminder', message:'Time to take your Metformin 500mg. Take after breakfast.', type:'MEDICINE' },
      { userId:'DOC-2024-CARD-001', userType:'DOCTOR', title:'New Appointment', message:'Patient Ramesh Kumar has booked an appointment for tomorrow at 10:00 AM.', type:'APPOINTMENT' },
    ],
    skipDuplicates: false,
  })

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60))
  console.log('✅ ArogyaSeva HMS seed completed successfully!\n')
  console.log('📊 Seeded records:')
  console.log(`   • Departments  : ${departments.length}`)
  console.log(`   • Rooms        : 3`)
  console.log(`   • Beds         : 5`)
  console.log(`   • Doctors      : 3`)
  console.log(`   • Staff        : 5`)
  console.log(`   • Patients     : 3`)
  console.log(`   • Medicines    : ${savedMeds.length}`)
  console.log(`   • Blood groups : 8`)
  console.log(`   • Ambulances   : 2`)
  console.log(`   • Bills        : 1`)
  console.log()
  console.log('🔑 Test Login Credentials:')
  console.log('   Patient  → PAT-2024-0001 / Patient@123')
  console.log('   Doctor   → DOC-2024-CARD-001 / Doctor@123')
  console.log('   Admin    → STF-ADM-001 / Bhanu@2024!   (user: bhanu07)')
  console.log('   Nurse    → STF-NRS-001 / Staff@123')
  console.log('   Pharma   → STF-PHR-001 / Staff@123')
  console.log('─'.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })