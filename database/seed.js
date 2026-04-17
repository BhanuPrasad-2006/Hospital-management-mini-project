// ============================================
// AROGYASEVA HMS - Database Seed
// database/seed.js
// Run: node database/seed.js
// Adds sample patients, doctors, staff to DB
// ============================================

require('dotenv').config({ path: './backend/.env' })
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const prisma = new PrismaClient()

// ── Encryption (same as encrypt.js) ──────────
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8')

function encryptToBuffer(text) {
  if (!text) return null
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv)
  let enc = cipher.update(String(text), 'utf8', 'hex')
  enc += cipher.final('hex')
  return Buffer.from(iv.toString('hex') + ':' + enc, 'utf8')
}

async function seed() {
  console.log('🌱 Starting database seed...')

  // ── 1. Hospital Settings ────────────────────
  await prisma.hospitalSettings.upsert({
    where:  { id: 'default' },
    update: {},
    create: {
      id:           'default',
      hospitalName: 'ArogyaSeva Medical Centre',
      address:      '123, Health Street, Bengaluru, Karnataka - 560001',
      phone:        '080-12345678',
      email:        'info@arogyaseva.in',
      emergencyPhone: '1800-123-4567',
      workingHours: '8:00 AM – 10:00 PM',
    }
  })
  console.log('✅ Hospital settings created')

  // ── 2. Departments ──────────────────────────
  const departments = [
    { name: 'Cardiology',    floor: 3, totalBeds: 20 },
    { name: 'Neurology',     floor: 4, totalBeds: 15 },
    { name: 'Orthopedics',   floor: 2, totalBeds: 18 },
    { name: 'Pediatrics',    floor: 1, totalBeds: 25 },
    { name: 'ICU',           floor: 5, totalBeds: 10 },
    { name: 'Emergency',     floor: 0, totalBeds: 15 },
    { name: 'Pharmacy',      floor: 0, totalBeds: 0  },
    { name: 'Laboratory',    floor: 1, totalBeds: 0  },
    { name: 'OPD',           floor: 1, totalBeds: 0  },
    { name: 'General Ward',  floor: 2, totalBeds: 30 },
  ]

  const createdDepts = {}
  for (const dept of departments) {
    const d = await prisma.department.upsert({
      where:  { name: dept.name },
      update: {},
      create: dept,
    })
    createdDepts[dept.name] = d.id
  }
  console.log('✅ Departments created:', Object.keys(createdDepts).length)

  // ── 3. Sample Doctors ────────────────────────
  const PASS = await bcrypt.hash('Doctor@123', 12)

  const doctors = [
    { doctorCode:'DOC-2024-CARD-001', firstName:'Anil',   lastName:'Sharma',  spec:'Cardiology',  qual:'MBBS, MD, DM',  lic:'KA-MED-2010-001', exp:14, fee:500, dept:'Cardiology'   },
    { doctorCode:'DOC-2024-NEUR-001', firstName:'Sunita', lastName:'Mehta',   spec:'Neurology',   qual:'MBBS, MD',      lic:'KA-MED-2012-002', exp:12, fee:600, dept:'Neurology'    },
    { doctorCode:'DOC-2024-ORTH-001', firstName:'Rajesh', lastName:'Patel',   spec:'Orthopedics', qual:'MBBS, MS Ortho',lic:'KA-MED-2013-003', exp:11, fee:450, dept:'Orthopedics'  },
    { doctorCode:'DOC-2024-PEDS-001', firstName:'Meena',  lastName:'Iyer',    spec:'Pediatrics',  qual:'MBBS, MD',      lic:'KA-MED-2015-004', exp:9,  fee:350, dept:'Pediatrics'   },
    { doctorCode:'DOC-2024-GENL-001', firstName:'Arjun',  lastName:'Reddy',   spec:'General',     qual:'MBBS',          lic:'KA-MED-2018-005', exp:6,  fee:250, dept:'OPD'          },
    { doctorCode:'DOC-2024-EMRG-001', firstName:'Kavya',  lastName:'Nair',    spec:'Emergency',   qual:'MBBS, MRCP',    lic:'KA-MED-2016-006', exp:8,  fee:400, dept:'Emergency'    },
  ]

  const createdDocs = {}
  for (const d of doctors) {
    const doc = await prisma.doctor.upsert({
      where:  { doctorCode: d.doctorCode },
      update: {},
      create: {
        doctorCode:      d.doctorCode,
        firstName:       d.firstName,
        lastName:        d.lastName,
        specialization:  d.spec,
        qualification:   d.qual,
        licenseNumber:   d.lic,
        experienceYears: d.exp,
        consultationFee: d.fee,
        phone:           encryptToBuffer(`98765${String(Math.floor(Math.random()*99999)).padStart(5,'0')}`),
        email:           encryptToBuffer(`${d.firstName.toLowerCase()}.${d.lastName.toLowerCase()}@arogyaseva.in`),
        passwordHash:    PASS,
        departmentId:    createdDepts[d.dept] || null,
        availableDays:   ['Monday','Tuesday','Wednesday','Thursday','Friday'],
      }
    })
    createdDocs[d.doctorCode] = doc.id
    await prisma.doctorSettings.upsert({
      where:  { doctorId: doc.id },
      update: {},
      create: { doctorId: doc.id },
    })
  }
  console.log('✅ Doctors created:', Object.keys(createdDocs).length)
  console.log('   Doctor codes:')
  doctors.forEach(d => console.log(`   ${d.doctorCode} → Dr. ${d.firstName} ${d.lastName} (${d.spec})`))

  // ── 4. Sample Staff ──────────────────────────
  const STAFF_PASS = await bcrypt.hash('Staff@123', 12)

  const staffMembers = [
    { staffId:'STF-ADM-001', firstName:'Admin',    lastName:'User',    role:'ADMIN',           phone:'9000000001' },
    { staffId:'STF-RCP-001', firstName:'Lakshmi',  lastName:'Devi',    role:'RECEPTIONIST',    phone:'9000000002' },
    { staffId:'STF-NRS-001', firstName:'Priya',    lastName:'Sharma',  role:'NURSE',           phone:'9000000003' },
    { staffId:'STF-NRS-002', firstName:'Radha',    lastName:'Kumari',  role:'NURSE',           phone:'9000000004' },
    { staffId:'STF-PHR-001', firstName:'Ravi',     lastName:'Kumar',   role:'PHARMACIST',      phone:'9000000005' },
    { staffId:'STF-LAB-001', firstName:'Suresh',   lastName:'Babu',    role:'LAB_TECHNICIAN',  phone:'9000000006' },
    { staffId:'STF-ACC-001', firstName:'Anita',    lastName:'Singh',   role:'ACCOUNTANT',      phone:'9000000007' },
    { staffId:'STF-AMB-001', firstName:'Muthu',    lastName:'Raj',     role:'AMBULANCE_DRIVER',phone:'9000000008' },
  ]

  for (const s of staffMembers) {
    const st = await prisma.staff.upsert({
      where:  { staffId: s.staffId },
      update: {},
      create: {
        staffId:      s.staffId,
        firstName:    s.firstName,
        lastName:     s.lastName,
        role:         s.role,
        phone:        encryptToBuffer(s.phone),
        email:        encryptToBuffer(`${s.firstName.toLowerCase()}@arogyaseva.in`),
        passwordHash: STAFF_PASS,
      }
    })
  }
  console.log('✅ Staff created:', staffMembers.length)
  console.log('   Staff IDs:')
  staffMembers.forEach(s => console.log(`   ${s.staffId} → ${s.firstName} ${s.lastName} (${s.role})`))

  // ── 5. Sample Patients ───────────────────────
  const PATIENT_PASS = await bcrypt.hash('Patient@123', 12)

  const patients = [
    { patientId:'PAT-2024-0001', first:'Ramesh',  last:'Kumar',  phone:'9876543210', dob:'1978-05-15', gender:'male',   blood:'O+',  lang:'en' },
    { patientId:'PAT-2024-0002', first:'Priya',   last:'Nair',   phone:'9876543211', dob:'1991-08-22', gender:'female', blood:'B+',  lang:'hi' },
    { patientId:'PAT-2024-0003', first:'Suresh',  last:'Reddy',  phone:'9876543212', dob:'1965-12-01', gender:'male',   blood:'A-',  lang:'te' },
    { patientId:'PAT-2024-0004', first:'Kavitha', last:'Devi',   phone:'9876543213', dob:'1995-03-18', gender:'female', blood:'AB+', lang:'kn' },
    { patientId:'PAT-2024-0005', first:'Mohan',   last:'Singh',  phone:'9876543214', dob:'1956-07-30', gender:'male',   blood:'O-',  lang:'hi' },
  ]

  const createdPats = {}
  for (const p of patients) {
    const pat = await prisma.patient.upsert({
      where:  { patientId: p.patientId },
      update: {},
      create: {
        patientId:         p.patientId,
        firstName:         encryptToBuffer(p.first),
        lastName:          encryptToBuffer(p.last),
        phone:             encryptToBuffer(p.phone),
        email:             encryptToBuffer(`${p.first.toLowerCase()}@example.com`),
        dateOfBirth:       new Date(p.dob),
        gender:            p.gender,
        bloodGroup:        p.blood,
        passwordHash:      PATIENT_PASS,
        preferredLanguage: p.lang,
        allergies:         p.first === 'Ramesh' ? ['Penicillin'] : [],
        chronicConditions: p.first === 'Ramesh' ? ['Hypertension','Type 2 Diabetes'] :
                           p.first === 'Mohan'  ? ['Cardiac Arrest History'] : [],
      }
    })
    createdPats[p.patientId] = pat.id
    await prisma.patientSettings.upsert({
      where:  { patientId: pat.id },
      update: {},
      create: { patientId: pat.id },
    })
  }
  console.log('✅ Patients created:', Object.keys(createdPats).length)

  // ── 6. Medicines ─────────────────────────────
  const medicines = [
    { name:'Paracetamol 500mg',  generic:'Paracetamol',          cat:'Painkiller', unit:'Tablet',  stock:450, reorder:100, price:2.50  },
    { name:'Amoxicillin 250mg',  generic:'Amoxicillin',          cat:'Antibiotic', unit:'Capsule', stock:80,  reorder:100, price:8.00  },
    { name:'Metformin 500mg',    generic:'Metformin HCl',        cat:'Diabetic',   unit:'Tablet',  stock:320, reorder:150, price:4.00  },
    { name:'Amlodipine 5mg',     generic:'Amlodipine Besylate',  cat:'BP',         unit:'Tablet',  stock:40,  reorder:100, price:6.50  },
    { name:'Vitamin D3 60000IU', generic:'Cholecalciferol',      cat:'Vitamin',    unit:'Sachet',  stock:190, reorder:50,  price:25.00 },
    { name:'Omeprazole 20mg',    generic:'Omeprazole',           cat:'Antacid',    unit:'Capsule', stock:280, reorder:80,  price:5.00  },
    { name:'Atorvastatin 10mg',  generic:'Atorvastatin',         cat:'Cholesterol',unit:'Tablet',  stock:160, reorder:60,  price:12.00 },
    { name:'Azithromycin 500mg', generic:'Azithromycin',         cat:'Antibiotic', unit:'Tablet',  stock:95,  reorder:80,  price:18.00 },
  ]

  for (const m of medicines) {
    await prisma.medicine.upsert({
      where:  { id: m.name.replace(/\s/g,'_') },
      update: { stockUnits: m.stock },
      create: {
        id:           m.name.replace(/\s/g,'_'),
        name:         m.name,
        genericName:  m.generic,
        category:     m.cat,
        unit:         m.unit,
        stockUnits:   m.stock,
        reorderLevel: m.reorder,
        unitPrice:    m.price,
        expiryDate:   new Date('2026-12-31'),
      }
    })
  }
  console.log('✅ Medicines created:', medicines.length)

  // ── 7. Ambulances ────────────────────────────
  const ambulances = [
    { vehicleNumber:'KA-01-AA-1234', driverName:'Ravi Kumar',  driverPhone:'9900001111', lat:12.9716, lng:77.5946, status:'available', equip:'advanced' },
    { vehicleNumber:'KA-01-BB-5678', driverName:'Suresh Babu', driverPhone:'9900002222', lat:12.9819, lng:77.6078, status:'available', equip:'basic'    },
    { vehicleNumber:'KA-01-CC-9012', driverName:'Muthu Raj',   driverPhone:'9900003333', lat:12.9631, lng:77.5838, status:'available', equip:'icu'      },
  ]

  for (const a of ambulances) {
    await prisma.ambulance.upsert({
      where:  { vehicleNumber: a.vehicleNumber },
      update: {},
      create: {
        vehicleNumber: a.vehicleNumber,
        driverName:    a.driverName,
        driverPhone:   a.driverPhone,
        currentLat:    a.lat,
        currentLng:    a.lng,
        status:        a.status,
        equipmentType: a.equip,
      }
    })
  }
  console.log('✅ Ambulances created:', ambulances.length)

  // ── 8. Blood Inventory ───────────────────────
  const bloodGroups = [
    { bloodGroup:'A+',  units:8  },
    { bloodGroup:'A-',  units:3  },
    { bloodGroup:'B+',  units:12 },
    { bloodGroup:'B-',  units:5  },
    { bloodGroup:'O+',  units:15 },
    { bloodGroup:'O-',  units:2  },
    { bloodGroup:'AB+', units:6  },
    { bloodGroup:'AB-', units:4  },
  ]

  for (const b of bloodGroups) {
    await prisma.bloodInventory.upsert({
      where:  { bloodGroup: b.bloodGroup },
      update: { unitsAvailable: b.units },
      create: { bloodGroup: b.bloodGroup, unitsAvailable: b.units },
    })
  }
  console.log('✅ Blood inventory seeded')

  // ── Done ──────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════╗
║     DATABASE SEED COMPLETE ✅             ║
╠══════════════════════════════════════════╣
║  Test Login Credentials:                 ║
║                                          ║
║  👤 Patient Login:                       ║
║     ID: PAT-2024-0001                    ║
║     Password: Patient@123                ║
║                                          ║
║  👨‍⚕️  Doctor Login:                       ║
║     Code: DOC-2024-CARD-001              ║
║     Password: Doctor@123                 ║
║                                          ║
║  🔑 Admin Login:                         ║
║     Staff ID: STF-ADM-001               ║
║     Password: Staff@123                  ║
╚══════════════════════════════════════════╝
  `)

  await prisma.$disconnect()
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  prisma.$disconnect()
  process.exit(1)
})
const bcrypt = require('bcrypt')
const crypto = require('crypto')
