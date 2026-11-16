
const axios = require("axios");
const crypto = require("crypto");
const supabase = require("../config/supabase");

const initializePaymentController = async (req, res) => {
  try {
    const user = req.user;
    const { plan } = req.body;

    if (!user?.id || !user?.email) {
      return res.status(401).json({
        success: false,
        message: "Please log in before subscribing.",
      });
    }

    if (!["pro", "business"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid subscription plan.",
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Payment service is not configured.",
      });
    }

    const planCodes = {
      pro: process.env.PAYSTACK_PRO_PLAN_CODE,
      business: process.env.PAYSTACK_BUSINESS_PLAN_CODE,
    };

    const planCode = planCodes[plan];

    if (!planCode) {
      return res.status(500).json({
        success: false,
        message: "The selected subscription plan is not configured.",
      });
    }

    const { data: billing, error: billingError } = await supabase
      .from("user_billing")
      .select("plan, subscription_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingError) throw billingError;

    if (!billing) {
      return res.status(404).json({
        success: false,
        message: "Your billing account could not be found.",
      });
    }

    if (
      billing.plan === plan &&
      billing.subscription_status === "active"
    ) {
      return res.status(409).json({
        success: false,
        message: "You are already subscribed to this plan.",
      });
    }

    const reference = `WEBLIVO_${crypto.randomUUID().replace(/-/g, "")}`;

    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        reference,
        plan,
        amount: plan === "pro" ? 500000 : 1200000,
        status: "pending",
      });

    if (transactionError) throw transactionError;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        plan: planCode,
        currency: "NGN",
        reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          user_id: user.id,
          plan,
          custom_fields: [
            {
              display_name: "WEBLIVO Plan",
              variable_name: "weblivo_plan",
              value: plan,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data?.status) {
      throw new Error("Paystack could not initialize the transaction.");
    }

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      authorizationUrl: response.data.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error(
      "Payment initialization error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to initialize your payment. Please try again.",
    });
  }
};


// Verify a payment and activate the subscription.
const verifyPaymentController = async (req, res) => {
  try {
    const user = req.user;
    const reference = req.query.reference || req.query.trxref;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in to verify this payment.",
      });
    }

    if (!reference || typeof reference !== "string") {
      return res.status(400).json({
        success: false,
        message: "Payment reference is missing.",
      });
    }

    // Find this user's pending payment.
    const { data: payment, error: paymentError } = await supabase
      .from("payment_transactions")
      .select("user_id, reference, plan, amount, status")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .maybeSingle();

    if (paymentError) throw paymentError;

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record could not be found.",
      });
    }

    if (payment.status === "success") {
      return res.status(200).json({
        success: true,
        alreadyProcessed: true,
        message: "Your subscription payment has already been processed.",
        plan: payment.plan,
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This payment cannot be verified.",
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new Error("Paystack secret key is missing.");
    }

    // Verify directly with Paystack.
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const verified = response.data?.data;

    if (
      !response.data?.status ||
      verified?.status !== "success"
    ) {
      return res.status(400).json({
        success: false,
        message: "Paystack has not confirmed this payment as successful.",
      });
    }

    // Validate the verified transaction.
    const expectedAmount = payment.plan === "pro" ? 500000 : 1200000;

    if (
      verified.reference !== payment.reference ||
      Number(verified.amount) !== Number(expectedAmount) ||
      verified.currency !== "NGN" ||
      verified.customer?.email?.toLowerCase() !== user.email?.toLowerCase()
    ) {
      console.error("Payment verification details did not match:", {
        reference: verified.reference,
        amount: verified.amount,
        currency: verified.currency,
      });

      return res.status(400).json({
        success: false,
        message: "Payment details could not be verified.",
      });
    }

    // Activate the plan through the secure database function.
    const { data: activationResult, error: activationError } =
      await supabase.rpc("complete_subscription_payment", {
        p_reference: reference,
        p_paystack_transaction_id: verified.id,
        p_customer_code: verified.customer?.customer_code || null,
        p_subscription_code:
          verified.subscription?.subscription_code || null,
      });

    if (activationError) throw activationError;

    if (
      activationResult !== "activated" &&
      activationResult !== "already_processed"
    ) {
      console.error("Subscription activation result:", activationResult);

      return res.status(500).json({
        success: false,
        message: "Payment was confirmed, but subscription activation needs attention. Please contact support.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated successfully.",
      plan: payment.plan,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify your payment right now. Please try again.",
    });
  }
};

module.exports = {
  initializePaymentController,
  verifyPaymentController,
};
