/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Socket.io Server Setup                        ║
 * ║  Attaches to the HTTP server created in server.js               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Rooms:
 *   emergency-{emergencyId}  — ambulance driver + patient tracking room
 *   admin-alerts             — all admin/nurse sessions for critical broadcasts
 *
 * Mount in server.js:
 *   const { attachSocketIO } = require("./config/socket");
 *   const { server } = require("./server");
 *   attachSocketIO(server, app);
 */

"use strict";

const { Server } = require("socket.io");

let _io = null;

/**
 * Initialize Socket.io and attach it to the HTTP server.
 * Also stores the io instance on the Express app so controllers
 * can access it via req.app.get("io").
 *
 * @param {http.Server} httpServer
 * @param {Express}     app
 * @returns {Server}    Socket.io server instance
 */
function attachSocketIO(httpServer, app) {
  if (_io) return _io;

  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map(o => o.trim());

  _io = new Server(httpServer, {
    cors: {
      origin:      allowedOrigins,
      methods:     ["GET", "POST"],
      credentials: true,
    },
    // Prefer WebSocket; fall back to polling
    transports: ["websocket", "polling"],
  });

  // Make io accessible from controllers: req.app.get("io")
  app.set("io", _io);

  _io.on("connection", (socket) => {
    const { role, userId, emergencyId } = socket.handshake.query;

    // Auto-join relevant rooms based on query params
    if (emergencyId) {
      socket.join(`emergency-${emergencyId}`);
      console.log(`[socket] ${socket.id} joined emergency-${emergencyId}`);
    }

    if (role === "ADMIN" || role === "NURSE" || role === "SECURITY_OFFICER") {
      socket.join("admin-alerts");
      console.log(`[socket] ${socket.id} (${role}) joined admin-alerts`);
    }

    socket.on("join:emergency", (id) => {
      socket.join(`emergency-${id}`);
    });

    socket.on("join:admin", () => {
      socket.join("admin-alerts");
    });

    socket.on("disconnect", () => {
      console.log(`[socket] ${socket.id} disconnected`);
    });
  });

  console.log("✅ Socket.io attached");
  return _io;
}

/**
 * Get the active Socket.io instance (after attachSocketIO has been called).
 */
function getIO() {
  if (!_io) throw new Error("[socket] Socket.io has not been initialized. Call attachSocketIO first.");
  return _io;
}

module.exports = { attachSocketIO, getIO };
