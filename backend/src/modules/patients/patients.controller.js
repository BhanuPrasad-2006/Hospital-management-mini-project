// ============================================
// AROGYASEVA HMS - Patient Controller
// ============================================

const { prisma } = require('../../config/db')

const {
  encryptToBuffer,
  decryptFromBuffer
} = require('../../security/encrypt')


/*
============================================
SAFE BYTE CONVERTER
============================================
*/
function safeDecrypt(value) {
  if (!value) return null

  try {
    return decryptFromBuffer(Buffer.from(value))
  } catch {
    return null
  }
}


/*
============================================
HELPER FUNCTION
============================================
*/
function decryptPatient(p) {
  return {
    id: p.id,
    patientId: p.patientId,
    abhaId: p.abhaId,

    firstName: safeDecrypt(p.firstName),
    lastName: safeDecrypt(p.lastName),

    fullName: `${
      safeDecrypt(p.firstName) || ''
    } ${
      safeDecrypt(p.lastName) || ''
    }`.trim(),

    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    bloodGroup: p.bloodGroup,

    phone: safeDecrypt(p.phone),

    email: safeDecrypt(p.email),
    address: safeDecrypt(p.address),
    emergencyContact: safeDecrypt(p.emergencyContact),
    emergencyPhone: safeDecrypt(p.emergencyPhone),

    allergies: p.allergies,
    chronicConditions: p.chronicConditions,

    createdAt: p.createdAt
  }
}


/*
============================================
CREATE PATIENT
============================================
*/
async function createPatient(req, res) {
  try {

    console.log("REGISTER HIT")
    console.log(req.body)

    const {
      patientId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      passwordHash
    } = req.body


    const patient = await prisma.patient.create({
      data: {
        patientId,
        firstName: encryptToBuffer(firstName),
        lastName: encryptToBuffer(lastName),
        dateOfBirth: new Date(dateOfBirth),
        gender,
        phone: encryptToBuffer(phone),
        passwordHash,
        allergies: [],
        chronicConditions: []
      }
    })


    res.status(201).json({
      message: 'Patient created successfully',
      patient: decryptPatient(patient)
    })

  } catch (err) {

    console.error("CREATE PATIENT ERROR:", err)

    res.status(500).json({
      error: err.message
    })
  }
}


/*
============================================
GET ALL PATIENTS
============================================
*/
async function getAllPatients(req, res) {
  try {

    const patients = await prisma.patient.findMany({
      where: {
        isDeleted: false
      }
    })

    res.json(
      patients.map(decryptPatient)
    )

  } catch (err) {

    res.status(500).json({
      error: 'Failed to fetch patients'
    })
  }
}


/*
============================================
GET SINGLE PATIENT
============================================
*/
async function getPatientById(req, res) {
  try {

    const patient = await prisma.patient.findUnique({
      where: {
        id: req.params.id
      }
    })

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      })
    }

    res.json(
      decryptPatient(patient)
    )

  } catch (err) {

    res.status(500).json({
      error: 'Failed to fetch patient'
    })
  }
}


/*
============================================
GET MY PROFILE
============================================
*/
async function getMyProfile(req, res) {
  req.params.id = req.user.id
  return getPatientById(req, res)
}


/*
============================================
UPDATE PATIENT
============================================
*/
async function updatePatient(req, res) {
  try {

    const updated =
      await prisma.patient.update({
        where: {
          id: req.params.id
        },
        data: req.body
      })

    res.json({
      message: 'Patient updated',
      patient: decryptPatient(updated)
    })

  } catch (err) {

    res.status(500).json({
      error: 'Failed to update patient'
    })
  }
}


/*
============================================
DELETE PATIENT
============================================
*/
async function deletePatient(req, res) {
  try {

    await prisma.patient.update({
      where: {
        id: req.params.id
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      }
    })

    res.json({
      message: 'Patient deleted successfully'
    })

  } catch (err) {

    res.status(500).json({
      error: 'Failed to delete patient'
    })
  }
}


/*
============================================
PATIENT HISTORY
============================================
*/
async function getPatientHistory(req, res) {
  try {

    const history =
      await prisma.appointment.findMany({
        where: {
          patientId: req.params.id
        }
      })

    res.json(history)

  } catch (err) {

    res.status(500).json({
      error: 'Failed to fetch history'
    })
  }
}


/*
============================================
PATIENT BILLS
============================================
*/
async function getPatientBills(req, res) {
  try {

    const patientId =
      req.params.id || req.user.id

    const bills =
      await prisma.bill.findMany({
        where: {
          patientId
        }
      })

    res.json(bills)

  } catch (err) {

    res.status(500).json({
      error: 'Failed to fetch bills'
    })
  }
}


module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  getMyProfile,
  updatePatient,
  deletePatient,
  getPatientHistory,
  getPatientBills
}