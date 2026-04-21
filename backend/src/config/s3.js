/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — AWS S3 Client                                 ║
 * ║  SDK v3 — single shared instance (lazy init)                    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Required .env variables:
 *   AWS_REGION          e.g. "ap-south-1"
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   S3_BUCKET_NAME      e.g. "arogyaseva-prescriptions"
 */

"use strict";

const { S3Client } = require("@aws-sdk/client-s3");

let _s3 = null;

/**
 * Returns the shared S3Client instance (lazy-initialized).
 * Throws with a clear message if env vars are missing.
 */
function getS3Client() {
  if (_s3) return _s3;

  const region    = process.env.AWS_REGION;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKey || !secretKey) {
    throw new Error(
      "[S3] Missing required env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY. " +
      "Add them to backend/.env"
    );
  }

  _s3 = new S3Client({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  return _s3;
}

const BUCKET = process.env.S3_BUCKET_NAME || "arogyaseva-prescriptions";

module.exports = { getS3Client, BUCKET };
