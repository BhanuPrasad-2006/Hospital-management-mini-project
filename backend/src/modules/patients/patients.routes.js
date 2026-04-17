const router = require('express').Router()
const ctrl = require('./patients.controller')
const { authenticate, authorize } = require('../../middleware/auth')

/*
PUBLIC ROUTES
*/
router.post('/register', ctrl.createPatient)

router.get('/test-all', ctrl.getAllPatients)


/*
PROTECTED ROUTES
*/
router.use(authenticate)

router.get('/me', ctrl.getMyProfile)

router.get('/me/bills', ctrl.getPatientBills)

router.get('/',
  authorize('admin','doctor','receptionist','nurse','accountant'),
  ctrl.getAllPatients
)

router.get('/:id',
  authorize('admin','doctor','receptionist','nurse','patient'),
  ctrl.getPatientById
)

module.exports = router