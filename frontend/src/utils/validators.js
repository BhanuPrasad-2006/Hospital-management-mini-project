/**
 * Utility: Validators
 * Client-side input validation helpers.
 */

export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPhone(phone) {
  // Indian mobile numbers: 10 digits starting with 6-9
  const re = /^[6-9]\d{9}$/;
  return re.test(phone.replace(/\D/g, ""));
}

export function isStrongPassword(password) {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return re.test(password);
}

export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&#]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "red" };
  if (score <= 4) return { label: "Medium", color: "orange" };
  return { label: "Strong", color: "green" };
}

export function isValidBloodGroup(bg) {
  const valid = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"];
  return valid.includes(bg);
}

export function sanitizeInput(str) {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "").trim();
}
