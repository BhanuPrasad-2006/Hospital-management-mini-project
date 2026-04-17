// ============================================
// AROGYASEVA HMS - Auth Routes
// backend/src/modules/auth/auth.routes.js
// ============================================

const router = require('express').Router()
const ctrl   = require('./auth.controller')
const { authenticate, authorize } = require('../../middleware/auth')

// Patient
router.post('/patient/signup',  ctrl.patientSignup)
router.post('/patient/login',   ctrl.patientLogin)

// Doctor
router.post('/doctor/login',    ctrl.doctorLogin)

// Staff / Admin
router.post('/staff/login',     ctrl.staffLogin)

// Admin only – create accounts
router.post('/admin/create-doctor', authenticate, authorize('admin'), ctrl.createDoctorAccount)
router.post('/admin/create-staff',  authenticate, authorize('admin'), ctrl.createStaffAccount)

// Token management
router.post('/refresh', ctrl.refreshToken)
router.post('/logout',  authenticate, ctrl.logout)

module.exports = router
