
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const generationRoutes = require("./routes/generationroutes");
const publishRoutes = require("./routes/publishroutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WEBLIVO API is running.",
  });
});

// API routes
app.use("/api/generation", generationRoutes);
app.use("/api/publish", publishRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  res.status(500).json({
    success: false,
    message: "An internal server error occurred.",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`WEBLIVO backend running on port ${PORT}`);
});
