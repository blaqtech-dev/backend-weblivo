const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");

const {
  initializePaymentController,
  verifyPaymentController,
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

module.exports = router;