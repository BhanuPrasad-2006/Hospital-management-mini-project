/**
 * Rate Limiting Middleware
 *
 * Protects against brute-force attacks and DoS by limiting the number
 * of requests a client can make within a time window.
 */

const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter — 100 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind a reverse proxy, otherwise use IP
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Strict rate limiter for authentication endpoints — 10 attempts per 15 minutes.
 * Prevents brute-force password attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Sensitive operations limiter — 5 requests per hour.
 * For password resets, account deletion, etc.
 */
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many sensitive requests. Please try again later.",
  },
});

module.exports = { generalLimiter, authLimiter, sensitiveLimiter };
