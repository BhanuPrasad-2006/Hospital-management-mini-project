/**
 * AES-256-GCM Encryption Utilities
 * Used to encrypt/decrypt sensitive patient data (PHI) at rest.
 *
 * Usage:
 *   const { encrypt, decrypt } = require("../security/encrypt");
 *   const cipher  = encrypt("SSN-123-45-6789");
 *   const plain   = decrypt(cipher);
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Get the encryption key from env, validating its length.
 * @returns {Buffer}
 */
function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param {string} plaintext
 * @returns {string} Base64-encoded payload: iv(16) + tag(16) + ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext) return plaintext;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();

  // Pack: IV + AuthTag + Ciphertext → Base64
  const payload = Buffer.concat([iv, tag, encrypted]);
  return payload.toString("base64");
}

/**
 * Decrypt a Base64-encoded AES-256-GCM payload.
 * @param {string} encryptedBase64
 * @returns {string} Original plaintext
 */
function decrypt(encryptedBase64) {
  if (!encryptedBase64) return encryptedBase64;

  const key = getKey();
  const payload = Buffer.from(encryptedBase64, "base64");

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
