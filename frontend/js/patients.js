/* ============================================
   AROGYASEVA HMS - Patients Logic
   patients.js
   ============================================ */

let allPatients = [...Mock.patients];
let filteredPatients = [...allPatients];

const statusColors = {
  Admitted: 'blue', OPD: 'green',
  Discharged: 'grey', Critical: 'red'
};

function loadPatients() {
  renderPatients(allPatients);
}

function renderPatients(patients) {
  const tbody = document.getElementById('patientsTbody');
  const count = document.getElementById('patientCount');
  if (!tbody) return;

  if (count) count.textContent = patients.length;

  if (patients.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <h3>No patients found</h3>
          <p>Try adjusting your filters or register a new patient</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = patients.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar avatar-sm">${p.name.charAt(0)}</div>
          <div>
            <div style="font-weight:600;color:var(--dark);font-size:14px">${p.name}</div>
            <div class="text-xs text-muted">${p.gender || '—'}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="id-chip">${p.id}</div>
        ${p.abha ? `<div class="text-xs text-muted mt-1">${p.abha}</div>` : ''}
      </td>
      <td style="font-size:13px">${p.age || '—'} yrs</td>
      <td><div class="blood-badge">${p.bloodGroup}</div></td>
      <td style="font-size:13px;color:var(--grey-600)">${p.doctor}</td>
      <td><span class="badge badge-${statusColors[p.status] || 'grey'}">${p.status}</span></td>
      <td style="font-size:13px;color:var(--grey-400)">${p.admittedOn || '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="viewPatient('${p.id}')">View</button>
          <button class="btn btn-outline btn-sm" onclick="editPatient('${p.id}')">Edit</button>
          <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)"
            onclick="deletePatient('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

function filterPatients() {
  const search = (document.getElementById('patientSearch')?.value || '').toLowerCase();
  const status = document.getElementById('statusFilter')?.value || '';
  const blood  = document.getElementById('bloodFilter')?.value  || '';

  filteredPatients = allPatients.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search) ||
      p.id.toLowerCase().includes(search) ||
      (p.phone && p.phone.includes(search));
    const matchStatus = !status || p.status === status;
    const matchBlood  = !blood  || p.bloodGroup === blood;
    return matchSearch && matchStatus && matchBlood;
  });

  renderPatients(filteredPatients);
}

function resetFilters() {
  document.getElementById('patientSearch').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('bloodFilter').value  = '';
  renderPatients(allPatients);
  document.getElementById('patientCount').textContent = allPatients.length;
}

function viewPatient(id) {
  const p = allPatients.find(x => x.id === id);
  if (!p) return;

  document.getElementById('viewPatientTitle').textContent = `👤 ${p.name}`;
  document.getElementById('viewPatientBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;
      padding:20px;background:var(--grey-50);border-radius:var(--radius)">
      <div class="avatar avatar-xl">${p.name.charAt(0)}</div>
      <div style="flex:1">
        <h2 style="font-size:20px;font-weight:700;color:var(--dark)">${p.name}</h2>
        <div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap">
          <div class="id-chip">${p.id}</div>
          <div class="blood-badge">${p.bloodGroup}</div>
          <span class="badge badge-${statusColors[p.status]||'grey'}">${p.status}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div class="text-xs text-muted">Admitted On</div>
        <div style="font-weight:600;color:var(--dark)">${p.admittedOn || '—'}</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-item"><label>Age</label><span>${p.age} years</span></div>
      <div class="info-item"><label>Gender</label><span>${p.gender}</span></div>
      <div class="info-item"><label>Blood Group</label><span>${p.bloodGroup}</span></div>
      <div class="info-item"><label>Phone</label><span>${p.phone}</span></div>
      <div class="info-item"><label>Assigned Doctor</label><span>${p.doctor}</span></div>
      <div class="info-item"><label>Visit Type</label><span>OPD</span></div>
      <div class="info-item"><label>Allergies</label><span>None recorded</span></div>
      <div class="info-item"><label>Language</label><span>English</span></div>
    </div>
    <div style="margin-top:20px">
      <div class="card-title mb-2">Vitals</div>
      <div class="vitals-grid">
        <div class="vital-card">
          <div class="vital-icon">❤️</div>
          <div class="vital-value">78</div>
          <div class="vital-unit">BPM</div>
          <div class="vital-label">Heart Rate</div>
        </div>
        <div class="vital-card">
          <div class="vital-icon">🩺</div>
          <div class="vital-value">120/80</div>
          <div class="vital-unit">mmHg</div>
          <div class="vital-label">Blood Pressure</div>
        </div>
        <div class="vital-card">
          <div class="vital-icon">🌡️</div>
          <div class="vital-value">98.6</div>
          <div class="vital-unit">°F</div>
          <div class="vital-label">Temperature</div>
        </div>
        <div class="vital-card">
          <div class="vital-icon">💨</div>
          <div class="vital-value">98</div>
          <div class="vital-unit">%</div>
          <div class="vital-label">SpO2</div>
        </div>
      </div>
    </div>`;
  openModal('viewPatientModal');
}

function editPatient(id) {
  showToast('Edit patient feature – connect to backend API', 'info');
}

function deletePatient(id) {
  confirmAction(`Delete patient ${id}? This cannot be undone.`, () => {
    allPatients = allPatients.filter(p => p.id !== id);
    filterPatients();
    showToast('Patient record deleted', 'success');
  });
}

function registerPatient() {
  const name   = document.getElementById('pName').value.trim();
  const dob    = document.getElementById('pDob').value;
  const gender = document.getElementById('pGender').value;
  const blood  = document.getElementById('pBlood').value;
  const phone  = document.getElementById('pPhone').value.trim();

  if (!name)   { document.getElementById('pNameErr').textContent = 'Name is required'; return; }
  if (!blood)  { showToast('Please select blood group', 'warning'); return; }
  if (!phone || phone.length !== 10) { showToast('Enter valid 10-digit phone', 'warning'); return; }

  const newPatient = {
    id: `P${String(allPatients.length + 1).padStart(3,'0')}`,
    name, bloodGroup: blood, gender, phone,
    doctor: document.getElementById('pDoctor').value || 'Unassigned',
    status: document.getElementById('pVisitType').value === 'OPD' ? 'OPD' : 'Admitted',
    admittedOn: new Date().toISOString().split('T')[0],
    age: dob ? Math.floor((Date.now() - new Date(dob)) / 31557600000) : 0,
  };

  allPatients.unshift(newPatient);
  filterPatients();
  closeModal('addPatientModal');
  showToast(`✅ Patient ${name} registered successfully!`, 'success');
  document.getElementById('addPatientModal').querySelectorAll('input,select,textarea')
    .forEach(el => el.value = '');
}
