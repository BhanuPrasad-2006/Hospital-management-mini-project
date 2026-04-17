/* ============================================
   AROGYASEVA HMS - Auth Logic
   auth.js
   NOTE: Login page to be implemented later.
   This file handles token management only.
   ============================================ */

// For now, set mock user so all pages work
if (!localStorage.getItem('user_name')) {
  localStorage.setItem('user_name', 'Dr. Admin');
  localStorage.setItem('user_role', 'Administrator');
  localStorage.setItem('token', 'mock-token-for-dev');
}

function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// Uncomment when login page is ready:
// if (!isLoggedIn()) window.location.href = '../index.html';
