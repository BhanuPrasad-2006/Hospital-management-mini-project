// ============================================
// AROGYASEVA HMS - Auth Controller
// backend/src/modules/auth/auth.controller.js
// Handles: Patient login/signup, Doctor login,
//          Staff/Admin login
// ============================================

const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const { prisma } = require('../../config/db')
const {
  encryptToBuffer,
  decryptFromBuffer,
} = require('../../security/encrypt')

// ── Generate JWT Tokens ───────────────────────
function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })
  const refreshToken = jwt.sign(
    { id: payload.id, role: payload.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
  return { accessToken, refreshToken }
}

// ── Generate Patient ID ───────────────────────
// Format: PAT-2024-0001
async function generatePatientId() {
  const year  = new Date().getFullYear()
  const count = await prisma.patient.count()
  const num   = String(count + 1).padStart(4, '0')
  return `PAT-${year}-${num}`
}

// ── Generate Staff ID ─────────────────────────
async function generateStaffId(role) {
  const roleAbbr = {
    NURSE:'NRS', PHARMACIST:'PHR', RECEPTIONIST:'RCP',
    LAB_TECHNICIAN:'LAB', ACCOUNTANT:'ACC',
    SECURITY_OFFICER:'SEC', HOUSEKEEPING:'HKP',
    AMBULANCE_DRIVER:'AMB', ADMIN:'ADM',
  }
  const abbr  = roleAbbr[role] || 'STF'
  const count = await prisma.staff.count({ where: { role } })
  const num   = String(count + 1).padStart(3, '0')
  return `STF-${abbr}-${num}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATIENT ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/auth/patient/signup
async function patientSignup(req, res) {
  try {
    const {
      firstName, lastName, phone, email,
      dateOfBirth, gender, bloodGroup,
      abhaId, password, preferredLanguage,
    } = req.body

    // Validate
    if (!firstName || !lastName || !phone || !password || !dateOfBirth) {
      return res.status(400).json({
        error: 'firstName, lastName, phone, password, dateOfBirth are required'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12)

    // Generate unique Patient ID
    const patientId = await generatePatientId()

    // Create patient with encrypted PII
    const patient = await prisma.patient.create({
      data: {
        patientId,
        abhaId:       abhaId || null,
        firstName:    encryptToBuffer(firstName),
        lastName:     encryptToBuffer(lastName),
        phone:        encryptToBuffer(phone),
        email:        email ? encryptToBuffer(email) : null,
        dateOfBirth:  new Date(dateOfBirth),
        gender:       gender || 'other',
        bloodGroup:   bloodGroup || null,
        passwordHash,
        preferredLanguage: preferredLanguage || 'en',
      }
    })

    // Create default settings
    await prisma.patientSettings.create({
      data: { patientId: patient.id }
    })

    const { accessToken, refreshToken } = generateTokens({
      id:   patient.id,
      role: 'patient',
      name: `${firstName} ${lastName}`,
    })

    res.status(201).json({
      message: 'Registration successful!',
      patientId: patient.patientId,  // e.g. PAT-2024-0001
      accessToken,
      refreshToken,
      user: {
        id:        patient.id,
        patientId: patient.patientId,
        name:      `${firstName} ${lastName}`,
        role:      'patient',
      }
    })

  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Phone number or ABHA ID already registered' })
    }
    console.error('Patient signup error:', err)
    res.status(500).json({ error: 'Signup failed. Please try again.' })
  }
}

// POST /api/auth/patient/login
async function patientLogin(req, res) {
  try {
    const { identifier, password } = req.body
    // identifier can be Patient ID (PAT-2024-0001) or phone number

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' })
    }

    let patient = null

    // Try by Patient ID first
    if (identifier.startsWith('PAT-')) {
      patient = await prisma.patient.findUnique({
        where: { patientId: identifier, isDeleted: false }
      })
    }

    // Try by phone (need to check all patients - encrypted)
    if (!patient) {
      // In production: store phone hash for search
      const allPatients = await prisma.patient.findMany({
        where: { isDeleted: false }
      })
      patient = allPatients.find(p => {
        const decrypted = decryptFromBuffer(p.phone)
        return decrypted === identifier
      })
    }

    if (!patient) {
      return res.status(401).json({ error: 'Invalid Patient ID or phone number' })
    }

    const validPassword = await bcrypt.compare(password, patient.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect password' })
    }

    const firstName = decryptFromBuffer(patient.firstName)
    const lastName  = decryptFromBuffer(patient.lastName)
    const name      = `${firstName} ${lastName}`

    const { accessToken, refreshToken } = generateTokens({
      id:   patient.id,
      role: 'patient',
      name,
    })

    // Save session
    await prisma.userSession.create({
      data: {
        userId:       patient.id,
        userRole:     'patient',
        ipAddress:    req.ip,
        refreshToken,
      }
    })

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id:        patient.id,
        patientId: patient.patientId,
        name,
        role:      'patient',
        bloodGroup:patient.bloodGroup,
        language:  patient.preferredLanguage,
      }
    })

  } catch (err) {
    console.error('Patient login error:', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOCTOR ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/auth/doctor/login
// Doctor logs in using their unique Doctor Code + password
async function doctorLogin(req, res) {
  try {
    const { doctorCode, password } = req.body

    if (!doctorCode || !password) {
      return res.status(400).json({ error: 'Doctor Code and password are required' })
    }

    const doctor = await prisma.doctor.findUnique({
      where: { doctorCode: doctorCode.toUpperCase(), isDeleted: false }
    })

    if (!doctor) {
      return res.status(401).json({ error: 'Invalid Doctor Code' })
    }

    if (!doctor.isActive) {
      return res.status(401).json({ error: 'Your account has been deactivated. Contact Admin.' })
    }

    const validPassword = await bcrypt.compare(password, doctor.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect password' })
    }

    const name = `Dr. ${doctor.firstName} ${doctor.lastName}`

    const { accessToken, refreshToken } = generateTokens({
      id:   doctor.id,
      role: 'doctor',
      name,
    })

    await prisma.userSession.create({
      data: {
        userId:       doctor.id,
        userRole:     'doctor',
        ipAddress:    req.ip,
        refreshToken,
      }
    })

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id:             doctor.id,
        doctorCode:     doctor.doctorCode,
        name,
        role:           'doctor',
        specialization: doctor.specialization,
        qualification:  doctor.qualification,
      }
    })

  } catch (err) {
    console.error('Doctor login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAFF / ADMIN ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/auth/staff/login
async function staffLogin(req, res) {
  try {
    const { staffId, password } = req.body

    if (!staffId || !password) {
      return res.status(400).json({ error: 'Staff ID and password are required' })
    }

    const staff = await prisma.staff.findUnique({
      where: { staffId: staffId.toUpperCase(), isDeleted: false }
    })

    if (!staff) {
      return res.status(401).json({ error: 'Invalid Staff ID' })
    }

    if (!staff.isActive) {
      return res.status(401).json({ error: 'Account deactivated. Contact Admin.' })
    }

    const validPassword = await bcrypt.compare(password, staff.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect password' })
    }

    const role = staff.role.toLowerCase()
    const name = `${staff.firstName} ${staff.lastName}`

    const { accessToken, refreshToken } = generateTokens({
      id:   staff.id,
      role: role === 'admin' ? 'admin' : role,
      name,
    })

    await prisma.userSession.create({
      data: {
        userId:   staff.id,
        userRole: role,
        ipAddress: req.ip,
        refreshToken,
      }
    })

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id:      staff.id,
        staffId: staff.staffId,
        name,
        role,
      }
    })

  } catch (err) {
    console.error('Staff login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

// ── ADMIN: Create Doctor Account ──────────────
// POST /api/auth/admin/create-doctor
async function createDoctorAccount(req, res) {
  try {
    const {
      firstName, lastName, specialization,
      qualification, licenseNumber, phone,
      email, password, departmentId,
      consultationFee, experienceYears,
    } = req.body

    if (!firstName || !lastName || !specialization || !licenseNumber || !password) {
      return res.status(400).json({ error: 'Required fields missing' })
    }

    // Generate Doctor Code
    const specAbbr = {
      'Cardiology':'CARD', 'Neurology':'NEUR', 'Orthopedics':'ORTH',
      'Pediatrics':'PEDS', 'General':'GENL', 'Emergency':'EMRG',
      'Dermatology':'DERM', 'ENT':'ENTO', 'Gynecology':'GYNE',
    }
    const year   = new Date().getFullYear()
    const abbr   = specAbbr[specialization] || 'GENL'
    const count  = await prisma.doctor.count()
    const num    = String(count + 1).padStart(3, '0')
    const doctorCode = `DOC-${year}-${abbr}-${num}`

    const passwordHash = await bcrypt.hash(password, 12)

    const doctor = await prisma.doctor.create({
      data: {
        doctorCode,
        firstName,
        lastName,
        specialization,
        qualification:   qualification || 'MBBS',
        licenseNumber,
        phone:           encryptToBuffer(phone),
        email:           encryptToBuffer(email),
        passwordHash,
        departmentId:    departmentId || null,
        consultationFee: parseFloat(consultationFee) || 0,
        experienceYears: parseInt(experienceYears) || 0,
      }
    })

    await prisma.doctorSettings.create({
      data: { doctorId: doctor.id }
    })

    res.status(201).json({
      message: `Doctor account created. Share this code with Dr. ${firstName}`,
      doctorCode,
      doctorId: doctor.id,
    })

  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'License number already exists' })
    }
    console.error('Create doctor error:', err)
    res.status(500).json({ error: 'Failed to create doctor account' })
  }
}

// ── ADMIN: Create Staff Account ───────────────
// POST /api/auth/admin/create-staff
async function createStaffAccount(req, res) {
  try {
    const {
      firstName, lastName, role,
      phone, email, password,
      qualification, departmentId,
    } = req.body

    if (!firstName || !lastName || !role || !phone || !password) {
      return res.status(400).json({ error: 'Required fields missing' })
    }

    const staffId      = await generateStaffId(role.toUpperCase())
    const passwordHash = await bcrypt.hash(password, 12)

    const staff = await prisma.staff.create({
      data: {
        staffId,
        firstName,
        lastName,
        role:          role.toUpperCase(),
        phone:         encryptToBuffer(phone),
        email:         encryptToBuffer(email),
        passwordHash,
        qualification: qualification || null,
        departmentId:  departmentId || null,
      }
    })

    res.status(201).json({
      message: `Staff account created. Share Staff ID: ${staffId}`,
      staffId: staff.staffId,
      staffDbId: staff.id,
    })

  } catch (err) {
    console.error('Create staff error:', err)
    res.status(500).json({ error: 'Failed to create staff account' })
  }
}

// ── Logout ────────────────────────────────────
async function logout(req, res) {
  try {
    await prisma.userSession.updateMany({
      where: { userId: req.user.id, isActive: true },
      data:  { isActive: false }
    })
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    res.json({ message: 'Logged out' })
  }
}

// ── Refresh Token ─────────────────────────────
async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body
    if (!token) return res.status(401).json({ error: 'Refresh token required' })

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)

    const { accessToken, refreshToken: newRefresh } = generateTokens({
      id:   decoded.id,
      role: decoded.role,
      name: decoded.name || '',
    })

    res.json({ accessToken, refreshToken: newRefresh })
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
}

module.exports = {
  patientSignup,
  patientLogin,
  doctorLogin,
  staffLogin,
  createDoctorAccount,
  createStaffAccount,
  logout,
  refreshToken,
}
