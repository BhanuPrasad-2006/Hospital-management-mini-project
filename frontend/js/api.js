/* ============================================
   AROGYASEVA HMS - Frontend API Service
   frontend/js/api.js
   Connects all HTML pages to Node.js backend
   ============================================ */

// ── Backend URL ────────────────────────────────
// Change this when you deploy to production
const API_BASE = 'http://localhost:5000/api'

/* ── Core Fetch Function ──────────────────────
   All API calls go through this one function   */
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('access_token')

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  if (body) options.body = JSON.stringify(body)

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options)

    // Token expired → try refresh then retry
    if (response.status === 401) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        // Retry with new token
        const newToken = localStorage.getItem('access_token')
        options.headers['Authorization'] = `Bearer ${newToken}`
        const retryRes = await fetch(`${API_BASE}${endpoint}`, options)
        return retryRes.json()
      } else {
        // Refresh also failed → logout
        clearAuthAndRedirect()
        return
      }
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data

  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.error('❌ Cannot connect to backend. Is the server running on port 5000?')
      showToast('Cannot connect to server. Check if backend is running.', 'error')
    }
    throw err
  }
}

// File upload (for prescriptions, photos)
async function apiUpload(endpoint, formData) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
    body: formData
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

// ── Token Refresh ──────────────────────────────
async function tryRefreshToken() {
  try {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return false

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (!res.ok) return false

    const data = await res.json()
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    return true
  } catch {
    return false
  }
}

// ── Logout / Redirect ──────────────────────────
function clearAuthAndRedirect() {
  localStorage.clear()
  const depth = window.location.pathname.split('/').length - 2
  const prefix = '../'.repeat(depth)
  window.location.href = `${prefix}index.html`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH API – connects to /api/auth/*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Auth = {
  // Patient
  patientSignup: (data)   => apiCall('/auth/patient/signup', 'POST', data),
  patientLogin:  (data)   => apiCall('/auth/patient/login',  'POST', data),

  // Doctor
  doctorLogin: (data) => apiCall('/auth/doctor/login', 'POST', data),

  // Staff/Admin
  staffLogin: (data) => apiCall('/auth/staff/login', 'POST', data),

  // Admin creates doctor/staff accounts
  createDoctor: (data) => apiCall('/auth/admin/create-doctor', 'POST', data),
  createStaff:  (data) => apiCall('/auth/admin/create-staff',  'POST', data),

  // Token
  refresh: () => apiCall('/auth/refresh', 'POST'),
  logout:  () => apiCall('/auth/logout',  'POST'),

  // ── Save auth data after login ──────────────
  saveSession(data) {
    localStorage.setItem('access_token',  data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    localStorage.setItem('user_id',       data.user.id)
    localStorage.setItem('user_role',     data.user.role)
    localStorage.setItem('user_name',     data.user.name)
    if (data.user.patientId) localStorage.setItem('patient_id', data.user.patientId)
    if (data.user.doctorCode) localStorage.setItem('doctor_code', data.user.doctorCode)
    if (data.user.staffId)   localStorage.setItem('staff_id', data.user.staffId)
  },

  // ── Redirect after login based on role ──────
  redirectByRole(role) {
    const routes = {
      patient:         'pages/patient/dashboard.html',
      doctor:          'pages/doctor/dashboard.html',
      admin:           'pages/admin/dashboard.html',
      nurse:           'pages/admin/dashboard.html',
      pharmacist:      'pages/admin/dashboard.html',
      receptionist:    'pages/admin/dashboard.html',
      accountant:      'pages/admin/dashboard.html',
      lab_technician:  'pages/admin/dashboard.html',
    }
    window.location.href = routes[role] || 'pages/admin/dashboard.html'
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATIENTS API – connects to /api/patients/*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Patients = {
  getAll:       (params = '') => apiCall(`/patients?${params}`),
  getById:      (id)          => apiCall(`/patients/${id}`),
  getMyProfile: ()            => apiCall('/patients/me'),
  getMyBills:   ()            => apiCall('/patients/me/bills'),
  update:       (id, data)    => apiCall(`/patients/${id}`, 'PUT', data),
  delete:       (id)          => apiCall(`/patients/${id}`, 'DELETE'),
  getHistory:   (id)          => apiCall(`/patients/${id}/history`),
  getBills:     (id)          => apiCall(`/patients/${id}/bills`),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOCTORS API – connects to /api/doctors/*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Doctors = {
  getAll:   (params = '') => apiCall(`/doctors?${params}`),
  getById:  (id)          => apiCall(`/doctors/${id}`),
  update:   (id, data)    => apiCall(`/doctors/${id}`, 'PUT', data),
  delete:   (id)          => apiCall(`/doctors/${id}`, 'DELETE'),
  getMyPatients: ()       => apiCall('/doctors/my-patients'),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAFF API – connects to /api/staff/*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Staff = {
  getAll:  (params = '') => apiCall(`/staff?${params}`),
  getById: (id)          => apiCall(`/staff/${id}`),
  update:  (id, data)    => apiCall(`/staff/${id}`, 'PUT', data),
  delete:  (id)          => apiCall(`/staff/${id}`, 'DELETE'),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPOINTMENTS API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Appointments = {
  getAll:    (params = '') => apiCall(`/appointments?${params}`),
  getById:   (id)          => apiCall(`/appointments/${id}`),
  create:    (data)        => apiCall('/appointments', 'POST', data),
  update:    (id, data)    => apiCall(`/appointments/${id}`, 'PUT', data),
  cancel:    (id)          => apiCall(`/appointments/${id}/cancel`, 'PUT'),
  getSlots:  (doctorId, date) => apiCall(`/appointments/slots?doctorId=${doctorId}&date=${date}`),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRESCRIPTIONS & AI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Prescriptions = {
  getAll:       (patientId) => apiCall(`/prescriptions?patientId=${patientId}`),
  create:       (data)      => apiCall('/prescriptions', 'POST', data),
  scanImage:    (formData)  => apiUpload('/ai/scan-prescription', formData),
  checkSymptoms:(data)      => apiCall('/ai/symptoms', 'POST', data),
  getDietPlan:  (id)        => apiCall(`/ai/diet/${id}`),
  chatWithAI:   (data)      => apiCall('/ai/chat', 'POST', data),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHARMACY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Pharmacy = {
  getAll:      (params = '') => apiCall(`/pharmacy?${params}`),
  getById:     (id)          => apiCall(`/pharmacy/${id}`),
  addMedicine: (data)        => apiCall('/pharmacy', 'POST', data),
  update:      (id, data)    => apiCall(`/pharmacy/${id}`, 'PUT', data),
  dispense:    (data)        => apiCall('/pharmacy/dispense', 'POST', data),
  getLowStock: ()            => apiCall('/pharmacy/low-stock'),
  placeOrder:  (data)        => apiCall('/pharmacy/order', 'POST', data),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BILLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Billing = {
  getAll:        (params = '') => apiCall(`/billing?${params}`),
  getById:       (id)          => apiCall(`/billing/${id}`),
  generate:      (data)        => apiCall('/billing', 'POST', data),
  recordPayment: (id, data)    => apiCall(`/billing/${id}/pay`, 'PUT', data),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMERGENCY / SOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Emergency = {
  triggerSOS:   (data)     => apiCall('/emergency/sos', 'POST', data),
  getAll:       ()         => apiCall('/emergency'),
  getById:      (id)       => apiCall(`/emergency/${id}`),
  getAmbulances:()         => apiCall('/emergency/ambulances'),
  updateStatus: (id, status) => apiCall(`/emergency/${id}/status`, 'PUT', { status }),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BLOOD BANK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Blood = {
  getDonors:    (params = '') => apiCall(`/blood/donors?${params}`),
  addDonor:     (data)        => apiCall('/blood/donors', 'POST', data),
  getInventory: ()            => apiCall('/blood/inventory'),
  makeRequest:  (data)        => apiCall('/blood/request', 'POST', data),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECURITY / AUDIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Security = {
  getAuditLogs: (params = '') => apiCall(`/security/audit-logs?${params}`),
  getThreats:   ()            => apiCall('/security/threats'),
  getSessions:  ()            => apiCall('/security/sessions'),
  killSession:  (id)          => apiCall(`/security/sessions/${id}`, 'DELETE'),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Settings = {
  get:                ()      => apiCall('/settings'),
  updateProfile:      (data)  => apiCall('/settings/profile', 'PUT', data),
  changePassword:     (data)  => apiCall('/settings/password', 'PUT', data),
  updateLanguage:     (lang)  => apiCall('/settings/language', 'PUT', { language: lang }),
  updateNotifications:(data)  => apiCall('/settings/notifications', 'PUT', data),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD STATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Dashboard = {
  getStats:    () => apiCall('/analytics/dashboard'),
  getActivity: () => apiCall('/analytics/activity'),
  getAlerts:   () => apiCall('/analytics/alerts'),
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CHECK (test if backend is running)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function checkBackendHealth() {
  try {
    const res = await fetch(`http://localhost:5000/health`)
    if (res.ok) {
      console.log('✅ Backend is running')
      return true
    }
  } catch {
    console.warn('⚠️ Backend not running. Start with: cd backend && npm run dev')
    return false
  }
}

// Check on page load
checkBackendHealth()
