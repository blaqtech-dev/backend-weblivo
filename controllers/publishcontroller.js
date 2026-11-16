
const supabase = require("../config/supabase");

const publishWebsiteController = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    // Verify project ownership and retrieve its details.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, business_name, status, subdomain, site_data")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    // A website must be generated before publishing.
    if (!project.site_data?.generated) {
      return res.status(400).json({
        success: false,
        message: "Please generate your website before publishing.",
      });
    }

    // Reuse existing subdomain or create one.
    const subdomain =
      project.subdomain ||
      `${project.business_name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${project.id.slice(0, 8)}`;

    // Securely enforce the user's publishing limit.
    const { data: result, error: publishError } = await supabase.rpc(
      "publish_user_project",
      {
        p_user_id: req.user.id,
        p_project_id: project.id,
        p_subdomain: subdomain,
      }
    );

    if (publishError) {
      console.error("Publishing limit error:", publishError.message);

      return res.status(500).json({
        success: false,
        message: "Unable to publish your website. Please try again.",
      });
    }

    if (result === "billing_not_found") {
      return res.status(403).json({
        success: false,
        message: "Your billing account could not be found.",
      });
    }

    if (result === "project_not_found") {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (result === "limit_reached") {
      return res.status(403).json({
        success: false,
        message:
          "You have reached your publishing limit. Upgrade your WEBLIVO plan to publish more websites.",
      });
    }

    if (
      result !== "published" &&
      result !== "already_published"
    ) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong while publishing your website.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        result === "already_published"
          ? "Your website is already published."
          : "Your website has been published successfully.",
      subdomain,
      url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/site/${subdomain}`,
    });

  } catch (error) {
    console.error("Publish controller error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while publishing your website.",
    });
  }
};

module.exports = {
  publishWebsiteController,
};
