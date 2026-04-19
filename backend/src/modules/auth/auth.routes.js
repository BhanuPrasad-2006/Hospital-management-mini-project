/**
 * Auth Module — Routes
 */

const { Router } = require("express");
const { register, login, logout, getMe } = require("./auth.controller");
const { authenticate } = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/ratelimit");

const router = Router();

// Public routes (rate-limited)
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);

module.exports = router;
