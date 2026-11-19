
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const { rateLimit } = require("express-rate-limit");
const bookingSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 2, // Maximum 5 requests
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many booking requests. Please try again in 15 minutes.",
  },
});
module.exports = supabase;
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");

const {
  createBooking,
  getProjectBookings,
  updateBookingStatus,
} = require("../controllers/bookingcontroller");

// Public: customers submit appointment requests.
router.post("/", bookingSubmissionLimiter, createBooking);

// Protected: business owners manage their bookings.
router.get("/:projectId", authMiddleware, getProjectBookings);

router.patch(
  "/:projectId/:bookingId",
  authMiddleware,
  updateBookingStatus
);

module.exports = router;