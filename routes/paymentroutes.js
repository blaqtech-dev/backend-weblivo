const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");

const {
  initializePaymentController,
} = require("../controllers/paymentcontroller");

// Initialize a subscription payment.
router.post(
  "/initialize",
  authMiddleware,
  initializePaymentController
);

module.exports = router;