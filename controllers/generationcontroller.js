
const supabase = require("../config/supabase");
const { generateWebsite } = require("../services/groqservice");

const generateWebsiteController = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    // Find the project and verify its ownership.
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

    // Validate the saved business information.
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

    // Generate the website using Groq.
const websiteData = await generateWebsite({
  businessName: project.business_name,
  businessType: project.site_data.business_type,
  description: project.description,
  designStyle: project.site_data.design_style,
  contactDetails: project.site_data.contact_details || {},
  previousTheme: project.site_data.generated?.theme || null,
});
    // Save the generated website without losing the original project details.
    const updatedSiteData = {
      ...project.site_data,
      generated: websiteData,
    };

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

    if (updateError) {
      console.error("Website save error:", updateError.message);

      return res.status(500).json({
        success: false,
        message: "Website generated, but we could not save it. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your website has been generated successfully.",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Website generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate your website right now. Please try again.",
    });
  }
};

module.exports = {
  generateWebsiteController,
};
