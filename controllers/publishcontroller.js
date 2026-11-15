
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

    // Find the project and verify ownership.
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

    // Reuse the existing subdomain if already assigned.
    const subdomain =
      project.subdomain ||
      `${project.business_name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${project.id.slice(0, 8)}`;

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        status: "published",
        subdomain,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .eq("user_id", req.user.id);

    if (updateError) {
      console.error("Publishing error:", updateError.message);

      return res.status(500).json({
        success: false,
        message: "Unable to publish your website. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your website has been published successfully.",
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
