
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");

const {
  publishWebsiteController,
} = require("../controllers/publishcontroller");

// Publish a specific project.
router.post(
  "/:projectId/publish",
  authMiddleware,
  publishWebsiteController
);

module.exports = router;
