// ============================================
// AROGYASEVA HMS - Auth Middleware
// backend/src/middleware/auth.js
// ============================================

const jwt  = require('jsonwebtoken')
const { prisma } = require('../config/db')

// ── Verify JWT Token ──────────────────────────
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = {
      id:       decoded.id,
      role:     decoded.role,   // patient/doctor/admin/nurse/pharmacist etc
      name:     decoded.name,
    }

    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ── Role-Based Access Control ─────────────────
// Usage: authorize('admin', 'doctor')
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(', ')}`
      })
    }
    next()
  }
}

// ── Patient can only access own data ──────────
function ownPatientOnly(req, res, next) {
  if (req.user.role === 'patient') {
    const requestedId = req.params.patientId || req.params.id
    if (req.user.id !== requestedId) {
      return res.status(403).json({
        error: 'Patients can only access their own records'
      })
    }
  }
  next()
}

// ── Doctor can only see own patients ──────────
function ownDoctorPatients(req, res, next) {
  // Doctors can only view their own patients unless admin
  if (req.user.role === 'doctor') {
    req.doctorFilter = req.user.id
  }
  next()
}

module.exports = { authenticate, authorize, ownPatientOnly, ownDoctorPatients }
