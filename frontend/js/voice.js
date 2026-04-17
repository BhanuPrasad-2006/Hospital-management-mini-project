/* ============================================
   AROGYASEVA HMS - Voice Assistant
   voice.js
   ============================================ */

let recognition = null;
let isListening = false;

function initVoiceAssistant() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Voice not supported in this browser');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous    = false;
  recognition.interimResults = false;
  recognition.lang = localStorage.getItem('voiceLang') || 'en-IN';

  recognition.onresult = (e) => {
    const cmd = e.results[0][0].transcript.toLowerCase();
    handleVoiceCommand(cmd);
  };

  recognition.onerror = () => { isListening = false; updateVoiceBtn(); };
  recognition.onend   = () => { isListening = false; updateVoiceBtn(); };
}

function toggleVoice() {
  if (!recognition) { showToast('Voice not supported in this browser','warning'); return; }
  if (isListening) { recognition.stop(); isListening = false; }
  else { recognition.start(); isListening = true; showToast('🎤 Listening...','info',2000); }
  updateVoiceBtn();
}

function updateVoiceBtn() {
  const btn = document.getElementById('voiceBtn');
  if (btn) btn.textContent = isListening ? '🔴 Stop' : '🎤 Voice';
}

function handleVoiceCommand(cmd) {
  showToast(`🎤 "${cmd}"`, 'info', 2000);

  const routes = {
    dashboard:    'dashboard.html',   patients:    'patients.html',
    doctors:      'doctors.html',     appointment: 'appointments.html',
    prescription: 'prescription.html',pharmacy:    'pharmacy.html',
    billing:      'billing.html',     emergency:   'emergency.html',
    blood:        'blood-bank.html',  security:    'security.html',
    settings:     'settings.html',
  };

  for (const [key, page] of Object.entries(routes)) {
    if (cmd.includes(key)) { location.href = page; return; }
  }

  if (cmd.includes('emergency') || cmd.includes('sos') || cmd.includes('help')) {
    triggerSOSAlert(); return;
  }

  if (cmd.includes('logout') || cmd.includes('sign out')) { logout(); return; }

  showToast(`Command not recognized: "${cmd}"`, 'warning');
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const lang = localStorage.getItem('voiceLang') || 'en-IN';
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

document.addEventListener('DOMContentLoaded', initVoiceAssistant);
