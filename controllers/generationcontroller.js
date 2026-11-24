
const supabase = require("../config/supabase");
const { generateWebsite } = require("../services/groqservice");

const generateWebsiteController = async (req, res) => {
  let creditTransactionId = null;

  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    // Verify project ownership.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    // Validate saved business information.
    if (
      !project.business_name ||
      !project.description ||
      !project.site_data?.business_type ||
      !project.site_data?.design_style
    ) {
      return res.status(400).json({
        success: false,
        message: "This project is missing required business information.",
      });
    }

    // Check whether the current account is an administrator.
    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Admin verification error:", adminError.message);

      return res.status(500).json({
        success: false,
        message: "Unable to verify account permissions. Please try again.",
      });
    }

    const isAdmin = Boolean(admin);

    // Reserve one AI credit for ordinary users only.
    if (!isAdmin) {
      const { data: transactionId, error: creditError } =
        await supabase.rpc("consume_user_credit", {
          p_user_id: req.user.id,
        });

      if (creditError) {
        console.error("Credit deduction error:", creditError.message);

        return res.status(500).json({
          success: false,
          message: "Unable to verify your AI credits. Please try again.",
        });
      }

      if (!transactionId) {
        return res.status(403).json({
          success: false,
          message:
            "You have no AI credits remaining. Please upgrade your plan to continue generating websites.",
        });
      }

      creditTransactionId = transactionId;
    }

    // Generate website using Groq.
    const websiteData = await generateWebsite({
      businessName: project.business_name,
      businessType: project.site_data.business_type,
      description: project.description,
      designStyle: project.site_data.design_style,
      contactDetails: project.site_data.contact_details || {},
      previousTheme: project.site_data.generated?.theme || null,
    });

    // Preserve existing project information.
    const updatedSiteData = {
      ...project.site_data,
      generated: websiteData,
    };

    // Save generated website.
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({
        site_data: updatedSiteData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .eq("user_id", req.user.id)
      .select("id, name, business_name, status, site_data")
      .single();

    if (updateError || !updatedProject) {
      console.error(
        "Website save error:",
        updateError?.message || "Updated project was not returned."
      );

      const saveError = new Error("Website save failed.");
      saveError.status = 500;
      throw saveError;
    }

    // Generation and saving succeeded.
    creditTransactionId = null;

    // Retrieve the updated credit balance for ordinary users.
    let creditsRemaining = null;

    if (!isAdmin) {
      const { data: billing, error: billingError } = await supabase
        .from("user_billing")
        .select("credits_remaining")
        .eq("user_id", req.user.id)
        .maybeSingle();

      if (billingError) {
        console.error("Credit balance lookup error:", billingError.message);
      }

      creditsRemaining = billing?.credits_remaining ?? null;
    }

    return res.status(200).json({
      success: true,
      message: "Your website has been generated successfully.",
      project: updatedProject,
      creditsRemaining,
      unlimited: isAdmin,
    });

  } catch (error) {
    console.error("Website generation error:", error);

    // Refund reserved credit when generation or saving fails.
    if (creditTransactionId) {
      const { data: refunded, error: refundError } = await supabase.rpc(
        "refund_user_credit",
        {
          p_transaction_id: creditTransactionId,
        }
      );

      if (refundError || !refunded) {
        console.error(
          "IMPORTANT: Credit refund failed:",
          refundError?.message || "Refund was not completed."
        );
      } else {
        console.log("Failed generation credit successfully refunded.");
      }
    }

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "WEBLIVO AI has temporarily reached its usage limit. Please try again later. Your existing website and saved changes are safe.",
      });
    }

    if (error.status === 502 || error.status === 503) {
      return res.status(503).json({
        success: false,
        message:
          "Our AI service is temporarily unavailable. Please try again shortly. Your existing website and saved changes are safe.",
      });
    }

    if (
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNABORTED"
    ) {
      return res.status(504).json({
        success: false,
        message:
          "Website generation is taking longer than expected. Please try again. Your existing website and saved changes are safe.",
      });
    }

    return res.status(error.status || 500).json({
      success: false,
      message:
        "We couldn't generate your website right now. Please try again shortly. Your existing website and saved changes are safe.",
    });
  }
};

module.exports = {
  generateWebsiteController,
};
