
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");
const adminMiddleware = require("../middleware/adminmiddleware");

const {
  publishWebsiteController,
} = require("../controllers/publishcontroller");

// Publish a specific project.
router.post(
  "/:projectId/publish",
  authMiddleware,
  adminMiddleware,
  publishWebsiteController
);

module.exports = router;
