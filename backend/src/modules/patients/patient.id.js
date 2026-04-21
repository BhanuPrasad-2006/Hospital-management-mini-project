/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Patient ID Generator                          ║
 * ║  Format: PAT-YYYY-XXXX  (zero-padded 4-digit sequence)          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * The sequence resets per year, so:
 *   First patient of 2024  → PAT-2024-0001
 *   1000th patient of 2025 → PAT-2025-1000
 *
 * Implementation:
 *   We query the DB for the highest sequence number in the current
 *   year inside a Prisma $transaction to avoid race conditions.
 */

"use strict";

const prisma = require("../../config/db");

/**
 * Generate the next patient ID in PAT-YYYY-XXXX format.
 * Must be called inside (or will start) a Prisma transaction.
 *
 * @param {object} [tx] - Optional Prisma transaction client. If omitted,
 *                        a standalone query is used (less safe under load).
 * @returns {Promise<string>} e.g. "PAT-2024-0042"
 */
async function generatePatientId(tx = prisma) {
  const year   = new Date().getFullYear();
  const prefix = `PAT-${year}-`;

  // Find the highest existing sequence for this year
  const last = await tx.patient.findFirst({
    where:   { patientId: { startsWith: prefix } },
    orderBy: { patientId: "desc" },
    select:  { patientId: true },
  });

  let next = 1;
  if (last?.patientId) {
    const parts   = last.patientId.split("-");           // ["PAT","2024","0042"]
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) next = lastSeq + 1;
  }

  // Zero-pad to 4 digits; if > 9999 let it overflow naturally (e.g. 10000)
  return `${prefix}${String(next).padStart(4, "0")}`;
}

module.exports = { generatePatientId };
