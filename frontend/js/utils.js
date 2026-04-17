/* ============================================
   AROGYASEVA HMS - Utility Functions
   utils.js
   ============================================ */

/* ── Toast Notifications ──────────────────── */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container')
    || createToastContainer();

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size:18px">${icons[type] || icons.info}</span>
    <span style="flex:1;font-size:14px;color:var(--grey-800)">${message}</span>
    <button onclick="this.parentElement.remove()"
      style="background:none;border:none;color:var(--grey-300);
             cursor:pointer;font-size:16px;padding:0;line-height:1">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  document.body.appendChild(div);
  return div;
}

/* ── Modal ────────────────────────────────── */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ESC key closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active')
      .forEach(m => { m.classList.remove('active'); document.body.style.overflow = ''; });
  }
});

/* ── Sidebar Toggle ───────────────────────── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });
  }

  // Restore state
  if (localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed');
  }

  // Mobile
  const mobileBtn = document.getElementById('mobileSidebarBtn');
  const overlay   = document.getElementById('mobileOverlay');

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay?.classList.toggle('active');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  // Set active nav item
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href.includes(currentPage)) item.classList.add('active');
  });
}

/* ── Clock ────────────────────────────────── */
function initClock() {
  const el = document.getElementById('topbarTime');
  if (!el) return;
  function update() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  update();
  setInterval(update, 1000);
}

/* ── Theme ────────────────────────────────── */
function initTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

/* ── User Info in Sidebar ─────────────────── */
function initUserInfo() {
  const name   = localStorage.getItem('user_name') || 'Admin User';
  const role   = localStorage.getItem('user_role') || 'Administrator';
  const initEl = document.getElementById('userInitial');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  if (initEl) initEl.textContent = name.charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role;
}

/* ── Format Helpers ───────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(amount);
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

/* ── Confirm Dialog ───────────────────────── */
function confirmAction(message, onConfirm) {
  const el = document.getElementById('confirmModal');
  if (!el) {
    if (window.confirm(message)) onConfirm();
    return;
  }
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmOkBtn').onclick = () => {
    closeModal('confirmModal');
    onConfirm();
  };
  openModal('confirmModal');
}

/* ── Debounce ─────────────────────────────── */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Form Validation ──────────────────────── */
function validateForm(formId, rules) {
  let valid = true;
  Object.entries(rules).forEach(([fieldId, rule]) => {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById(fieldId + 'Err');
    if (!field) return;
    let msg = '';
    if (rule.required && !field.value.trim()) msg = rule.required;
    else if (rule.minLength && field.value.length < rule.minLength)
      msg = `Minimum ${rule.minLength} characters`;
    else if (rule.pattern && !rule.pattern.test(field.value))
      msg = rule.patternMsg || 'Invalid format';

    if (errEl) errEl.textContent = msg;
    if (msg) {
      field.style.borderColor = 'var(--danger)';
      valid = false;
    } else {
      field.style.borderColor = '';
    }
  });
  return valid;
}

/* ── Accordion ────────────────────────────── */
function initAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      body.classList.toggle('open');
    });
  });
}

/* ── Tabs ─────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      const parent = btn.closest('.tab-wrap') || document;
      parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      parent.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const content = parent.querySelector(`#${target}`);
      if (content) content.style.display = 'block';
    });
  });
}

/* ── Logout ───────────────────────────────── */
function logout() {
  confirmAction('Are you sure you want to logout?', () => {
    localStorage.clear();
    window.location.href = '../index.html';
  });
}

/* ── Init all on load ─────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initClock();
  initTheme();
  initUserInfo();
  initAccordions();
  initTabs();
});
