
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");

const {
  createEnquiry,
  getProjectEnquiries,
  updateEnquiryStatus,
} = require("../controllers/enquirycontroller");

const { rateLimit } = require("express-rate-limit");

// Limit public enquiry submissions.
const enquirySubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many enquiries. Please try again in 15 minutes.",
  },
});

// CUSTOMER SUBMITS AN ENQUIRY
router.post("/", enquirySubmissionLimiter, createEnquiry);

// WEBSITE OWNER VIEWS ENQUIRIES
router.get("/:projectId", authMiddleware, getProjectEnquiries);

// WEBSITE OWNER UPDATES ENQUIRY STATUS
router.patch(
  "/:projectId/:enquiryId",
  authMiddleware,
  updateEnquiryStatus
);

module.exports = router;
