
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");

const {
  initializePaymentController,
  verifyPaymentController,
  paystackWebhookController,
} = require("../controllers/paymentcontroller");

// Initialize a subscription payment.
router.post(
  "/initialize",
  authMiddleware,
  initializePaymentController
);

// Verify a completed subscription payment.
router.get(
  "/verify",
  authMiddleware,
  verifyPaymentController
);

// Receive Paystack subscription and payment events.
// This route must NOT use user authentication middleware.
router.post(
  "/webhook",
  paystackWebhookController
);

module.exports = router;
