
const axios = require("axios");
const crypto = require("crypto");
const supabase = require("../config/supabase");

// --------------------------------------------------
// INITIALIZE PAYMENT
// --------------------------------------------------

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


// --------------------------------------------------
// VERIFY PAYMENT
// --------------------------------------------------

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

    const expectedAmount = payment.plan === "pro" ? 500000 : 1200000;

    if (
      verified.reference !== payment.reference ||
      Number(verified.amount) !== expectedAmount ||
      verified.currency !== "NGN" ||
      verified.customer?.email?.toLowerCase() !== user.email?.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details could not be verified.",
      });
    }

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


// --------------------------------------------------
// WEBHOOK EVENT HELPERS
// --------------------------------------------------


const saveWebhookEvent = async (eventKey, eventType, data, payload) => {
  const { data: existing, error: lookupError } = await supabase
    .from("paystack_webhook_events")
    .select("processing_status, received_at")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.processing_status === "processed") {
    return "already_processed";
  }

  if (existing?.processing_status === "pending") {
    const age = Date.now() - new Date(existing.received_at).getTime();

    // Allow another delivery to retry an abandoned event.
    if (age < 120000) {
      return "in_progress";
    }
  }

  if (existing) {
    const { error } = await supabase
      .from("paystack_webhook_events")
      .update({
        processing_status: "pending",
        error_message: null,
        payload,
        received_at: new Date().toISOString(),
      })
      .eq("event_key", eventKey);

    if (error) throw error;

    return "continue";
  }

  const { error } = await supabase
    .from("paystack_webhook_events")
    .insert({
      event_key: eventKey,
      event_type: eventType,
      reference: data?.reference || data?.transaction?.reference || null,
      payload,
      processing_status: "pending",
    });

  if (error) {
    if (error.code === "23505") {
      return "in_progress";
    }

    throw error;
  }

  return "continue";
};



const markWebhookProcessed = async (eventKey) => {
  const { error } = await supabase
    .from("paystack_webhook_events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("event_key", eventKey);

  if (error) throw error;
};


const markWebhookFailed = async (eventKey, message) => {
  await supabase
    .from("paystack_webhook_events")
    .update({
      processing_status: "failed",
      error_message: String(message).slice(0, 1000),
    })
    .eq("event_key", eventKey);
};


// --------------------------------------------------
// FIND SUBSCRIPTION
// --------------------------------------------------

const findBillingAccount = async (subscriptionCode, customerCode) => {
  let query = supabase
    .from("user_billing")
    .select("user_id, plan, subscription_status");

  if (subscriptionCode) {
    query = query.eq("paystack_subscription_code", subscriptionCode);
  } else if (customerCode) {
    query = query.eq("paystack_customer_code", customerCode);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return data;
};


// --------------------------------------------------
// PAYSTACK WEBHOOK
// --------------------------------------------------

const paystackWebhookController = async (req, res) => {
  let eventKey = null;

  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers["x-paystack-signature"];

    if (!secret || !signature || !req.rawBody) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook request.",
      });
    }

    // Verify Paystack's HMAC SHA512 signature.
    const expectedSignature = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest("hex");

    const receivedBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature.",
      });
    }

    const payload = req.body;
    const eventType = payload?.event;
    const data = payload?.data || {};

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: "Webhook event type is missing.",
      });
    }

    // Create a stable key so duplicate deliveries are recognised.
    const eventIdentifier =
  data.id ||
  data.reference ||
  data.invoice_code ||
  data.invoice?.invoice_code ||
  data.subscription?.subscription_code ||
  data.subscription_code ||
  crypto.createHash("sha256").update(req.rawBody).digest("hex");

    eventKey = `${eventType}:${eventIdentifier}`;

    const saved = await saveWebhookEvent(
      eventKey,
      eventType,
      data,
      payload
    );

  if (saved === "already_processed") {
  return res.status(200).json({
    success: true,
    message: "Webhook already processed.",
  });
}

if (saved === "in_progress") {
  return res.status(503).json({
    success: false,
    message: "Webhook is currently being processed. Please retry.",
  });
}
    // Paystack dashboard ping.
    if (eventType === "ping") {
      await markWebhookProcessed(eventKey);

      return res.status(200).json({
        success: true,
        message: "WEBLIVO webhook is working.",
      });
    }

    // ----------------------------------------------
    // SUCCESSFUL PAYMENT OR MONTHLY RENEWAL
    // ----------------------------------------------

    if (eventType === "charge.success") {
      if (data.status !== "success") {
        throw new Error("Charge event was not successful.");
      }

      const amount = Number(data.amount);
      const currency = data.currency;
      const plan = amount === 500000
        ? "pro"
        : amount === 1200000
          ? "business"
          : null;

      const customerCode = data.customer?.customer_code;
      const subscriptionCode =
        data.subscription?.subscription_code ||
        data.subscription_code ||
        null;

      if (!plan || !data.reference || !data.id || !customerCode) {
        throw new Error("Incomplete subscription payment details.");
      }

      const { data: result, error } = await supabase.rpc(
        "process_recurring_subscription_payment",
        {
          p_event_key: eventKey,
          p_reference: data.reference,
          p_transaction_id: data.id,
          p_customer_code: customerCode,
          p_subscription_code: subscriptionCode,
          p_plan: plan,
          p_amount: amount,
          p_currency: currency,
        }
      );

      if (error) throw error;

      if (
        ![
          "original_payment_processed",
          "renewal_processed",
          "already_processed",
        ].includes(result)
      ) {
        throw new Error(`Payment processing returned: ${result}`);
      }

      console.log("Paystack charge processed:", result);
    }

    // ----------------------------------------------
    // SUBSCRIPTION CREATED
    // ----------------------------------------------

  
else if (eventType === "subscription.create") {
  const customerCode = data.customer?.customer_code;
  const subscriptionCode =
    data.subscription_code ||
    data.subscription?.subscription_code;

  const planCode =
    data.plan?.plan_code ||
    data.plan_code;

  const plan =
    planCode === process.env.PAYSTACK_PRO_PLAN_CODE
      ? "pro"
      : planCode === process.env.PAYSTACK_BUSINESS_PLAN_CODE
        ? "business"
        : null;

  if (!customerCode || !subscriptionCode || !plan) {
    throw new Error(
      "Subscription creation event is missing required details."
    );
  }

  const { data: billing, error: billingError } = await supabase
    .from("user_billing")
    .select("user_id, plan")
    .eq("paystack_customer_code", customerCode)
    .maybeSingle();

  if (billingError) throw billingError;

  if (billing && billing.plan === plan) {
    const { error } = await supabase
      .from("user_billing")
      .update({
        paystack_subscription_code: subscriptionCode,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", billing.user_id);

    if (error) throw error;
  } else {
    console.log(
      "Subscription created; billing activation will save its subscription code when payment is verified."
    );
  }
}


    // ----------------------------------------------
    // FAILED MONTHLY PAYMENT
    // ----------------------------------------------

    else if (eventType === "invoice.payment_failed") {
      const subscriptionCode =
        data.subscription?.subscription_code ||
        data.subscription_code ||
        null;

      const customerCode =
        data.customer?.customer_code ||
        null;

      const billing = await findBillingAccount(
        subscriptionCode,
        customerCode
      );

      if (billing) {
        const { error } = await supabase
          .from("user_billing")
          .update({
            subscription_status: "attention",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", billing.user_id);

        if (error) throw error;
      } else {
        throw new Error("Billing account for failed invoice was not found.");
      }
    }

    // ----------------------------------------------
    // SUBSCRIPTION WILL NOT RENEW
    // ----------------------------------------------

    else if (eventType === "subscription.not_renew") {
      const subscriptionCode =
        data.subscription_code ||
        data.subscription?.subscription_code;

      const billing = await findBillingAccount(
        subscriptionCode,
        data.customer?.customer_code
      );

      if (billing) {
        const { error } = await supabase
          .from("user_billing")
          .update({
            subscription_status: "non-renewing",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", billing.user_id);

        if (error) throw error;
      }
    }

    // ----------------------------------------------
    // SUBSCRIPTION DISABLED / EXPIRED
    // ----------------------------------------------

    else if (eventType === "subscription.disable") {
      const subscriptionCode =
        data.subscription_code ||
        data.subscription?.subscription_code;

      if (!subscriptionCode) {
        throw new Error("Subscription code is missing from disable event.");
      }

    const { data: billing, error: billingError } = await supabase
  .from("user_billing")
  .select("user_id, plan, paystack_subscription_code")
  .eq("paystack_subscription_code", subscriptionCode)
  .maybeSingle();

      if (billingError) throw billingError;

     if (billing && billing.paystack_subscription_code === subscriptionCode) {
        const { error } = await supabase
          .from("user_billing")
          .update({
            plan: "free",
            credits_remaining: 0,
            max_projects: 2,
            max_published_websites: 1,
            subscription_status: "inactive",
            current_period_start: null,
            current_period_end: null,
            paystack_subscription_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", billing.user_id);

        if (error) throw error;
      } else {
        throw new Error("Subscription account could not be found.");
      }
    }

    // Other event types are recorded without changing billing.
    await markWebhookProcessed(eventKey);

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully.",
    });

  } catch (error) {
    console.error("Paystack webhook error:", error.message);

    if (eventKey) {
      await markWebhookFailed(eventKey, error.message);
    }

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};


module.exports = {
  initializePaymentController,
  verifyPaymentController,
  paystackWebhookController,
};
