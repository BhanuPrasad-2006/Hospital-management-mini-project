/**
 * Secure File Upload Middleware
 *
 * Configures multer with strict file type validation and size limits.
 * Prevents malicious file uploads (e.g. executables disguised as images).
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Allowed MIME types and their extensions
const ALLOWED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "text/csv": [".csv"],
};

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

/**
 * Storage configuration — renames files with a random UUID to prevent
 * path traversal and filename collisions.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter — validates both MIME type and extension.
 */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ALLOWED_TYPES[file.mimetype];

  if (!allowedExtensions) {
    return cb(new Error(`File type "${file.mimetype}" is not allowed.`), false);
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`File extension "${ext}" does not match MIME type "${file.mimetype}".`),
      false
    );
  }

  cb(null, true);
}

/**
 * Configured multer instance.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Max 5 files per request
  },
});

/**
 * Error handler for multer errors — returns friendly messages.
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 5 files per upload.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
}

module.exports = { upload, handleUploadError };
