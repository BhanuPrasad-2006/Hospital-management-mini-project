/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — File Upload Middleware (PRD §8.4)             ║
 * ║  multer memoryStorage → pipe directly to S3 (no disk write)     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Security controls:
 *   - MIME type whitelist (jpeg/png/webp/pdf only)
 *   - Extension validation (must match MIME)
 *   - Path traversal detection (../ ..\)
 *   - Max size: 10 MB
 *   - memoryStorage: file never touches disk
 */

"use strict";

const multer = require("multer");
const path   = require("path");

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;

const ALLOWED = {
  "image/jpeg":      [".jpg", ".jpeg"],
  "image/png":       [".png"],
  "image/webp":      [".webp"],
  "application/pdf": [".pdf"],
};

// ─── Path traversal detection ─────────────────────────────────────────────────

function _hasPathTraversal(filename) {
  // Detect ../ ..\  and URL-encoded variants %2e%2e
  return (
    filename.includes("../") ||
    filename.includes("..\\") ||
    /\.\.(\/|\\|%2f|%5c)/i.test(filename) ||
    /(%2e){2}/i.test(filename)
  );
}

// ─── Multer fileFilter ────────────────────────────────────────────────────────

function _fileFilter(req, file, cb) {
  const originalName = file.originalname || "";

  // 1. Path traversal check
  if (_hasPathTraversal(originalName)) {
    return cb(
      Object.assign(new Error("Filename contains path traversal characters."), { status: 400 })
    );
  }

  // 2. MIME type whitelist
  const allowedExts = ALLOWED[file.mimetype];
  if (!allowedExts) {
    return cb(
      Object.assign(
        new Error(`File type "${file.mimetype}" is not allowed. Accepted: JPEG, PNG, WebP, PDF.`),
        { status: 400 }
      )
    );
  }

  // 3. Extension must match declared MIME (prevents mime spoofing)
  const ext = path.extname(originalName).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(
      Object.assign(
        new Error(`File extension "${ext}" does not match MIME type "${file.mimetype}".`),
        { status: 400 }
      )
    );
  }

  cb(null, true);
}

// ─── Multer instances ─────────────────────────────────────────────────────────

// Memory storage — buffer is available at req.file.buffer for direct S3 streaming
const _memoryStorage = multer.memoryStorage();

/**
 * Single-file uploader for prescription / lab report images.
 * Field name: "file"
 */
const prescriptionUpload = multer({
  storage:    _memoryStorage,
  fileFilter: _fileFilter,
  limits:     { fileSize: MAX_SIZE_BYTES, files: 1 },
});

/**
 * Multi-file uploader for document uploads (up to 5 files).
 * Field name: "files"
 */
const documentUpload = multer({
  storage:    _memoryStorage,
  fileFilter: _fileFilter,
  limits:     { fileSize: MAX_SIZE_BYTES, files: 5 },
});

// ─── Multer error handler ─────────────────────────────────────────────────────

/**
 * Express error-handling middleware for multer errors.
 * Must be placed AFTER the multer middleware in the stack.
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          error:   `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
          code:    "FILE_TOO_LARGE",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          error:   "Too many files. Maximum 5 files per request.",
          code:    "TOO_MANY_FILES",
        });
      default:
        return res.status(400).json({
          success: false,
          error:   `Upload error: ${err.message}`,
          code:    "UPLOAD_ERROR",
        });
    }
  }

  // Custom errors from fileFilter (status attached above)
  if (err?.status === 400) {
    return res.status(400).json({
      success: false,
      error:   err.message,
      code:    "INVALID_FILE",
    });
  }

  next(err);
}

module.exports = { prescriptionUpload, documentUpload, handleUploadError };
