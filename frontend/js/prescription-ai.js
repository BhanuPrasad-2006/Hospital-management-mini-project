/* ============================================
   AROGYASEVA HMS - AI Prescription Logic
   prescription-ai.js
   ============================================ */

const MOCK_RESULT = {
  diagnosis: 'Type 2 Diabetes Mellitus with Hypertension',
  medicines: [
    { name: 'Metformin 500mg', generic: 'Metformin Hydrochloride', dosage: '500mg',
      frequency: 'Twice daily', timing: 'After meals', duration: '30 days',
      purpose: 'Controls blood sugar levels in Type 2 Diabetes',
      sideEffects: 'Nausea, stomach upset (usually improves over time)' },
    { name: 'Amlodipine 5mg', generic: 'Amlodipine Besylate', dosage: '5mg',
      frequency: 'Once daily', timing: 'Morning, with water', duration: '30 days',
      purpose: 'Lowers blood pressure by relaxing blood vessels',
      sideEffects: 'Ankle swelling, dizziness when standing up quickly' },
    { name: 'Vitamin D3 60000 IU', generic: 'Cholecalciferol', dosage: '60000 IU',
      frequency: 'Once weekly', timing: 'After breakfast', duration: '12 weeks',
      purpose: 'Treats Vitamin D deficiency, supports bone health and immunity',
      sideEffects: 'Generally well tolerated. Do not take more than prescribed.' },
  ],
  warnings: [
    { medicines: 'Metformin + Amlodipine', severity: 'Mild', note: 'Monitor blood pressure regularly. Both may cause dizziness.' }
  ],
  dietPlan: {
    eat: ['Whole grains (brown rice, oats, millets)', 'Leafy vegetables (spinach, methi)', 'Lean protein (dal, fish, egg whites)', 'Low-fat dairy products', 'Fresh fruits (except very sweet ones)'],
    avoid: ['White rice in large quantities', 'Sugary drinks and sweets', 'Fried and oily foods', 'Processed/packaged foods', 'Excess salt (limit to 5g/day)'],
    notes: '💧 Drink 2.5–3 litres of water daily. Have 4–5 small meals instead of 3 large ones. Walk 30 minutes daily after meals.'
  }
};

function previewFile(input) {
  const file = input.files[0];
  if (!file) return;

  const preview = document.getElementById('previewImg');
  const content = document.getElementById('uploadContent');
  const actions  = document.getElementById('uploadActions');

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = 'block';
      content.style.display  = 'none';
      actions.style.display  = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    content.innerHTML = `<div class="upload-icon">📄</div>
      <div style="font-size:16px;font-weight:700;color:var(--dark)">${file.name}</div>
      <div class="text-sm text-muted">${(file.size/1024).toFixed(1)} KB</div>`;
    actions.style.display = 'block';
  }

  // Drag over effect
  document.getElementById('uploadZone').style.borderColor = 'var(--primary)';
}

function clearUpload() {
  document.getElementById('prescriptionFile').value = '';
  document.getElementById('previewImg').style.display  = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('uploadContent').style.display = '';
  document.getElementById('uploadActions').style.display = 'none';
  document.getElementById('uploadZone').style.borderColor = '';
  document.getElementById('uploadContent').innerHTML = `
    <div class="upload-icon">🏥</div>
    <div style="font-size:17px;font-weight:700;color:var(--dark);margin-bottom:8px">
      Drop prescription here or click to upload
    </div>
    <div class="text-sm text-muted">Supports JPG, PNG, PDF. Works with handwritten prescriptions.</div>`;
  hideResults();
}

async function scanPrescription() {
  const file = document.getElementById('prescriptionFile').files[0];
  if (!file) { showToast('Please upload a prescription image first', 'warning'); return; }

  showLoading();

  // Simulate API call (replace with real Claude API call)
  await new Promise(r => setTimeout(r, 3000));

  showResults(MOCK_RESULT);
}

function showLoading() {
  document.getElementById('aiLoading').style.display = 'flex';
  document.getElementById('aiResults').style.display  = 'none';
  document.getElementById('aiEmpty').style.display    = 'none';
}

function hideResults() {
  document.getElementById('aiLoading').style.display = 'none';
  document.getElementById('aiResults').style.display  = 'none';
  document.getElementById('aiEmpty').style.display    = 'block';
}

function showResults(data) {
  document.getElementById('aiLoading').style.display = 'none';
  document.getElementById('aiResults').style.display  = 'block';
  document.getElementById('aiEmpty').style.display    = 'none';

  document.getElementById('aiTimestamp').textContent =
    'Analysed at ' + new Date().toLocaleTimeString('en-IN');
  document.getElementById('aiDiagnosis').textContent =
    '📋 Diagnosis: ' + data.diagnosis;

  // Medicines
  const medList = document.getElementById('medicinesList');
  document.getElementById('medCount').textContent = `${data.medicines.length} medicines`;
  medList.innerHTML = data.medicines.map((m, i) => `
    <div class="medicine-item">
      <div class="medicine-num">${i+1}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            <div style="font-weight:700;color:var(--dark)">${m.name}</div>
            <div class="text-xs text-muted">${m.generic}</div>
          </div>
          <span class="badge badge-blue">${m.dosage}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
          <div style="font-size:12px"><span class="text-muted">Frequency: </span><strong>${m.frequency}</strong></div>
          <div style="font-size:12px"><span class="text-muted">When: </span><strong>${m.timing}</strong></div>
          <div style="font-size:12px"><span class="text-muted">Duration: </span><strong>${m.duration}</strong></div>
        </div>
        <div style="font-size:12px;color:var(--grey-600);background:var(--grey-50);
          padding:8px;border-radius:6px;margin-bottom:4px">
          💊 <strong>Purpose:</strong> ${m.purpose}
        </div>
        <div style="font-size:12px;color:var(--orange)">
          ⚠️ ${m.sideEffects}
        </div>
      </div>
    </div>`).join('');

  // Warnings
  if (data.warnings.length) {
    document.getElementById('warningsCard').style.display = 'block';
    document.getElementById('warningsList').innerHTML = data.warnings.map(w => `
      <div class="alert alert-warning">
        ⚠️ <strong>${w.medicines}</strong> – ${w.note}
        <span class="badge badge-orange" style="margin-left:8px">${w.severity}</span>
      </div>`).join('');
  }

  // Diet
  const eat   = document.getElementById('dietEat');
  const avoid = document.getElementById('dietAvoid');
  eat.innerHTML   = data.dietPlan.eat.map(i => `<li>✅ ${i}</li>`).join('');
  avoid.innerHTML = data.dietPlan.avoid.map(i => `<li>❌ ${i}</li>`).join('');
  document.getElementById('dietNotes').textContent = data.dietPlan.notes;
}

function checkSymptoms() {
  const symptoms = document.getElementById('symptomsInput').value.trim();
  if (!symptoms) { showToast('Please describe symptoms', 'warning'); return; }

  const resultEl = document.getElementById('symptomResult');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div style="background:var(--primary-light);padding:16px;border-radius:var(--radius);margin-top:16px">
      <div style="font-weight:700;color:var(--primary);margin-bottom:12px">🤖 AI Analysis</div>
      <div style="font-size:13px;color:var(--grey-600);line-height:1.7">
        <strong>Possible Conditions:</strong> Viral Fever, Common Cold<br>
        <strong>Urgency:</strong> <span style="color:var(--warning);font-weight:600">Moderate – See doctor within 24-48 hours</span><br>
        <strong>Recommended Specialist:</strong> General Physician<br><br>
        <strong>Home Care:</strong><br>
        • Rest and stay hydrated (8-10 glasses of water/day)<br>
        • Paracetamol for fever (follow doctor advice for dosage)<br>
        • Avoid cold foods and drinks<br>
        • Monitor temperature every 4 hours<br><br>
        <span style="color:var(--danger);font-weight:600">⚠️ Go to Emergency immediately if:</span> Difficulty breathing, very high fever (&gt;104°F), chest pain, confusion
      </div>
      <div class="alert alert-info mt-2" style="margin-top:12px;margin-bottom:0">
        This is AI guidance only. Please consult a registered doctor for diagnosis and treatment.
      </div>
    </div>`;
}

function saveResults() {
  const patientId = document.getElementById('aiPatientSelect').value;
  if (!patientId) { showToast('Please select a patient to save results', 'warning'); return; }
  showToast(`✅ Prescription results saved for ${patientId}`, 'success');
}

function printResults() {
  window.print();
}
