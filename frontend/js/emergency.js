/* ============================================
   AROGYASEVA HMS - Emergency Logic
   emergency.js
   ============================================ */

let sosTriggered = false;

async function triggerFullSOS() {
  if (sosTriggered) return;
  sosTriggered = true;

  const btn    = document.getElementById('sosBigBtn');
  const status = document.getElementById('sosStatus');

  btn.style.opacity = '0.7';
  btn.disabled = true;

  status.className = 'sos-status active';
  status.innerHTML = '⏳ Getting your GPS location...';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        status.innerHTML = `📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} – Finding nearest ambulance...`;

        await new Promise(r => setTimeout(r, 1500));
        status.innerHTML = '🚑 Ambulance KA-01-AA-1234 dispatched! ETA: 4 minutes';

        showToast('🆘 SOS triggered! Ambulance dispatched. ETA: 4 min', 'error', 8000);

        setTimeout(() => {
          sosTriggered = false;
          btn.disabled = false;
          btn.style.opacity = '1';
          status.className = 'sos-status';
          status.innerHTML = '📍 Ready – Press SOS to trigger emergency response';
        }, 15000);
      },
      () => {
        status.innerHTML = '⚠️ Location unavailable. Dispatching nearest ambulance...';
        showToast('🆘 SOS triggered! Location unavailable. Nearest ambulance dispatched.', 'error', 6000);
        setTimeout(() => {
          sosTriggered = false;
          btn.disabled = false;
          btn.style.opacity = '1';
          status.className = 'sos-status';
          status.innerHTML = '📍 Ready – Press SOS to trigger emergency response';
        }, 8000);
      }
    );
  } else {
    status.innerHTML = '⚠️ Geolocation not supported. Dispatching nearest ambulance.';
    showToast('🆘 SOS triggered!', 'error', 5000);
    setTimeout(() => {
      sosTriggered = false;
      btn.disabled = false;
      btn.style.opacity = '1';
      status.className = 'sos-status';
      status.innerHTML = '📍 Ready – Press SOS to trigger emergency response';
    }, 6000);
  }
}

function getMyLocation() {
  if (!navigator.geolocation) { showToast('Geolocation not supported', 'warning'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('emLocation').value =
      `GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
    showToast('📍 Location captured', 'success');
  });
}

function logEmergency() {
  const patient  = document.getElementById('emPatient').value.trim();
  const type     = document.getElementById('emType').value;
  const location = document.getElementById('emLocation').value.trim();

  if (!location) { showToast('Please enter or capture location', 'warning'); return; }

  showToast(`🚨 Emergency logged: ${type} for ${patient || 'Unknown'}. Ambulance dispatched!`, 'error', 6000);
  document.getElementById('emPatient').value  = '';
  document.getElementById('emLocation').value = '';
  document.getElementById('emNotes').value    = '';
}
