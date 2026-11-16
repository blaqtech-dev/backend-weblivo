
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
      console.error("Paystack secret key is missing.");

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

    // Prevent duplicate active subscriptions.
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

    // Save a pending payment record.
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

    // Initialize subscription checkout with Paystack.
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
      message:
        "Unable to initialize your payment. Please try again.",
    });
  }
};

module.exports = {
  initializePaymentController,
};
