/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — PII Encryption Utility                        ║
 * ║  AES-256-CBC with PKCS#7 padding + HMAC-SHA256 integrity check  ║
 * ║  Output stored as BYTEA (Buffer) in PostgreSQL                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Why AES-256-CBC (as required by PRD) instead of GCM?
 *   The PRD explicitly requests AES-256-CBC.  We add an HMAC-SHA256
 *   authentication tag manually to compensate for CBC lacking built-in
 *   authenticated encryption — this pattern is called "Encrypt-then-MAC".
 *
 * Wire format (all packed into a single Buffer → stored as BYTEA):
 *   [ IV (16 bytes) | HMAC (32 bytes) | CIPHERTEXT (variable) ]
 *
 * Environment variables required:
 *   ENCRYPTION_KEY  — 64 hex chars = 32 bytes (AES key)
 *   HMAC_KEY        — 64 hex chars = 32 bytes (separate HMAC key)
 *
 * Usage:
 *   const { encryptPII, decryptPII } = require("../security/encrypt");
 *
 *   // Encrypt before INSERT
 *   const encryptedName = encryptPII("Rajesh Kumar");   // → Buffer (for Prisma Bytes field)
 *
 *   // Decrypt after SELECT
 *   const name = decryptPII(patient.firstName);          // → "Rajesh Kumar"
 *
 *   // For JSON objects (emergencyContact, address)
 *   const encAddr = encryptJSON({ street: "123 MG Road", city: "Bengaluru" });
 *   const addr    = decryptJSON(patient.address);
 */

"use strict";

const crypto = require("crypto");

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM  = "aes-256-cbc";
const IV_LENGTH  = 16;  // AES block size
const HMAC_SIZE  = 32;  // SHA-256 digest size

// ─── Key Management ───────────────────────────────────────────────────────────

/** Lazily-loaded AES key — validated once on first use. */
let _aesKey  = null;
let _hmacKey = null;

function _getAesKey() {
  if (_aesKey) return _aesKey;

  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "[encrypt] ENCRYPTION_KEY must be 64 hex chars (32 bytes). " +
      "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  _aesKey = Buffer.from(hex, "hex");
  return _aesKey;
}

function _getHmacKey() {
  if (_hmacKey) return _hmacKey;

  const hex = process.env.HMAC_KEY || process.env.ENCRYPTION_KEY; // fallback if only one key provided
  if (!hex || hex.length !== 64) {
    throw new Error(
      "[encrypt] HMAC_KEY must be 64 hex chars (32 bytes). " +
      "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  _hmacKey = Buffer.from(hex, "hex");
  return _hmacKey;
}

// ─── Core Encrypt / Decrypt ───────────────────────────────────────────────────

/**
 * Encrypt a UTF-8 string using AES-256-CBC + HMAC-SHA256 (Encrypt-then-MAC).
 *
 * @param  {string} plaintext
 * @returns {Buffer} Wire format: IV(16) | HMAC(32) | CIPHERTEXT
 *                   Ready to be stored as Prisma `Bytes` (BYTEA in PostgreSQL)
 */
function encryptPII(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;

  const aesKey = _getAesKey();
  const iv     = crypto.randomBytes(IV_LENGTH);

  // Encrypt
  const cipher    = crypto.createCipheriv(ALGORITHM, aesKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);

  // Authenticate: HMAC over IV + ciphertext
  const hmac = crypto
    .createHmac("sha256", _getHmacKey())
    .update(Buffer.concat([iv, encrypted]))
    .digest();

  // Pack: IV | HMAC | CIPHERTEXT
  return Buffer.concat([iv, hmac, encrypted]);
}

/**
 * Decrypt a Buffer produced by encryptPII().
 *
 * @param  {Buffer|null} cipherBuf
 * @returns {string|null} Original plaintext
 */
function decryptPII(cipherBuf) {
  if (!cipherBuf) return null;

  // Prisma returns Bytes fields as Buffer already; handle both Buffer and hex string
  const buf = Buffer.isBuffer(cipherBuf)
    ? cipherBuf
    : Buffer.from(cipherBuf, "hex");

  if (buf.length < IV_LENGTH + HMAC_SIZE + 1) {
    throw new Error("[encrypt] Ciphertext is too short to be valid.");
  }

  const iv         = buf.subarray(0, IV_LENGTH);
  const storedHmac = buf.subarray(IV_LENGTH, IV_LENGTH + HMAC_SIZE);
  const ciphertext = buf.subarray(IV_LENGTH + HMAC_SIZE);

  // Verify HMAC before decrypting (prevents padding oracle attacks)
  const expectedHmac = crypto
    .createHmac("sha256", _getHmacKey())
    .update(Buffer.concat([iv, ciphertext]))
    .digest();

  if (!crypto.timingSafeEqual(storedHmac, expectedHmac)) {
    throw new Error("[encrypt] HMAC verification failed — ciphertext may be tampered.");
  }

  const decipher  = crypto.createDecipheriv(ALGORITHM, _getAesKey(), iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString("utf8");
}

// ─── JSON Helpers (for emergencyContact, address) ────────────────────────────

/**
 * Encrypt a plain JS object as JSON → AES-256-CBC Buffer.
 * @param  {object} obj
 * @returns {Buffer|null}
 */
function encryptJSON(obj) {
  if (obj === null || obj === undefined) return null;
  return encryptPII(JSON.stringify(obj));
}

/**
 * Decrypt a Buffer back to a JS object.
 * @param  {Buffer|null} cipherBuf
 * @returns {object|null}
 */
function decryptJSON(cipherBuf) {
  const str = decryptPII(cipherBuf);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    throw new Error("[encrypt] decryptJSON: decrypted value is not valid JSON.");
  }
}

// ─── Prisma Transform Helpers ─────────────────────────────────────────────────

/**
 * Encrypt a record's PII fields before passing to Prisma create/update.
 *
 * @param {object} data    - Raw input object
 * @param {string[]} fields - Field names to encrypt (must be strings)
 * @param {string[]} [jsonFields] - Field names to encrypt as JSON
 * @returns {object} New object with encrypted fields as Buffers
 *
 * @example
 *   const safeData = encryptFields(req.body, ["firstName","lastName","phone"], ["address","emergencyContact"]);
 *   await prisma.patient.create({ data: safeData });
 */
function encryptFields(data, fields = [], jsonFields = []) {
  const result = { ...data };

  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encryptPII(result[field]);
    }
  }

  for (const field of jsonFields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encryptJSON(result[field]);
    }
  }

  return result;
}

/**
 * Decrypt a record's PII fields after fetching from Prisma.
 *
 * @param {object} record - Prisma record
 * @param {string[]} fields - Field names to decrypt
 * @param {string[]} [jsonFields] - Field names to decrypt as JSON
 * @returns {object} New object with decrypted plaintext fields
 */
function decryptFields(record, fields = [], jsonFields = []) {
  if (!record) return null;
  const result = { ...record };

  for (const field of fields) {
    if (result[field] != null) {
      result[field] = decryptPII(result[field]);
    }
  }

  for (const field of jsonFields) {
    if (result[field] != null) {
      result[field] = decryptJSON(result[field]);
    }
  }

  return result;
}

// ─── Patient PII field lists ──────────────────────────────────────────────────

/** Standard PII fields on the Patient model. */
const PATIENT_PII_FIELDS      = ["firstName", "lastName", "phone", "email", "address"];
const PATIENT_PII_JSON_FIELDS = ["emergencyContact"];

/** Standard PII fields on the Doctor model. */
const DOCTOR_PII_FIELDS       = ["phone", "email"];

/** Standard PII fields on the Staff model. */
const STAFF_PII_FIELDS        = ["phone", "email"];

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  encryptPII,
  decryptPII,
  encryptJSON,
  decryptJSON,
  encryptFields,
  decryptFields,
  PATIENT_PII_FIELDS,
  PATIENT_PII_JSON_FIELDS,
  DOCTOR_PII_FIELDS,
  STAFF_PII_FIELDS,
};
