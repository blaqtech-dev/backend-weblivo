
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
router.post("/", createBooking);

// Protected: business owners manage their bookings.
router.get("/:projectId", authMiddleware, getProjectBookings);

router.patch(
  "/:projectId/:bookingId",
  authMiddleware,
  updateBookingStatus
);

module.exports = router;