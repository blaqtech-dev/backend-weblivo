
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");
const {
  generateWebsiteController,
} = require("../controllers/generationcontroller");

// Generate a website for a specific project.
router.post(
  "/:projectId/generate",
  authMiddleware,
  generateWebsiteController
);

module.exports = router;
