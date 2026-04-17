// ============================================
// AROGYASEVA HMS - AES-256 Encryption Utility
// backend/src/security/encrypt.js
// ============================================

const crypto = require('crypto')

/*
============================================
GENERATE FIXED 32-BYTE KEY
============================================
*/
const KEY = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || 'default_secret_key')
  .digest()

const IV_LENGTH = 16


/*
============================================
ENCRYPT STRING
============================================
*/
function encrypt(text) {
  if (!text) return null

  try {

    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      KEY,
      iv
    )

    let encrypted = cipher.update(
      String(text),
      'utf8',
      'hex'
    )

    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted

  } catch (err) {

    console.error(
      'Encryption error:',
      err.message
    )

    return null
  }
}


/*
============================================
DECRYPT STRING
============================================
*/
function decrypt(encryptedText) {
  if (!encryptedText) return null

  try {

    // If plain text / old data
    if (!encryptedText.includes(':')) {
      return encryptedText
    }

    const [ivHex, encrypted] =
      encryptedText.split(':')

    if (!ivHex || !encrypted) {
      return encryptedText
    }

    const iv = Buffer.from(ivHex, 'hex')

    if (iv.length !== IV_LENGTH) {
      throw new Error(
        'Invalid IV length'
      )
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      KEY,
      iv
    )

    let decrypted = decipher.update(
      encrypted,
      'hex',
      'utf8'
    )

    decrypted += decipher.final('utf8')

    return decrypted

  } catch (err) {

    console.error(
      'Decryption error:',
      err.message
    )

    return encryptedText
  }
}


/*
============================================
ENCRYPT TO BUFFER
============================================
*/
function encryptToBuffer(text) {
  if (!text) return null

  const encrypted = encrypt(text)

  return encrypted
    ? Buffer.from(encrypted, 'utf8')
    : null
}


/*
============================================
DECRYPT FROM BUFFER
============================================
*/
function decryptFromBuffer(buffer) {
  if (!buffer) return null

  try {

    let encryptedText

    if (Buffer.isBuffer(buffer)) {
      encryptedText = buffer.toString('utf8')
    }

    else if (Array.isArray(buffer)) {
      encryptedText = Buffer
        .from(buffer)
        .toString('utf8')
    }

    else {
      encryptedText = String(buffer)
    }

    return decrypt(encryptedText)

  } catch (err) {

    console.error(
      'Buffer Decryption error:',
      err.message
    )

    return null
  }
}


/*
============================================
HASH FOR SEARCH
============================================
*/
function hashForSearch(text) {
  if (!text) return null

  return crypto
    .createHmac(
      'sha256',
      process.env.ENCRYPTION_KEY || 'default_secret_key'
    )
    .update(
      String(text).toLowerCase()
    )
    .digest('hex')
}


/*
============================================
EXPORTS
============================================
*/
module.exports = {
  encrypt,
  decrypt,
  encryptToBuffer,
  decryptFromBuffer,
  hashForSearch
}