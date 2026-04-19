/**
 * Input Sanitization Middleware
 *
 * Strips HTML tags and potential XSS payloads from all incoming request bodies,
 * query params, and URL params.
 *
 * Note: Prisma's parameterized queries already protect against SQL injection.
 * This middleware focuses on XSS prevention.
 */

/**
 * Recursively sanitize all string values in an object.
 * Strips HTML tags and common XSS vectors.
 * @param {any} value
 * @returns {any}
 */
function sanitizeValue(value) {
  if (typeof value === "string") {
    return value
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove javascript: protocol
      .replace(/javascript\s*:/gi, "")
      // Remove on* event handlers
      .replace(/on\w+\s*=/gi, "")
      // Remove data: protocol (except safe image types)
      .replace(/data\s*:[^;]*;/gi, "")
      // Trim whitespace
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Express middleware — sanitizes req.body, req.query, and req.params.
 */
function sanitize(req, res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
}

module.exports = { sanitize, sanitizeValue };
