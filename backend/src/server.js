require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Routes
// app.use("/api/auth", require("./routes/auth.routes"));
// app.use("/api/patients", require("./routes/patient.routes"));
// app.use("/api/doctors", require("./routes/doctor.routes"));
// app.use("/api/appointments", require("./routes/appointment.routes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Hospital Management API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
