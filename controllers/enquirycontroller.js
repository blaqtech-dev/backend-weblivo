
const supabase = require("../config/supabase");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });


// CUSTOMER SUBMITS AN ENQUIRY
const createEnquiry = async (req, res) => {
  try {
    const {
      projectId,
      customerName,
      customerEmail,
      customerPhone,
      subject,
      message,
    } = req.body;

    if (
      !projectId ||
      !customerName ||
      !message
    ) {
      return sendError(
        res,
        400,
        "Please complete all required enquiry fields."
      );
    }

    if (!UUID_REGEX.test(projectId)) {
      return sendError(res, 400, "Invalid project.");
    }

    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      customerName.trim().length > 100 ||
      typeof message !== "string" ||
      !message.trim() ||
      message.trim().length > 3000 ||
      (subject !== undefined &&
        subject !== null &&
        typeof subject !== "string") ||
      (customerEmail !== undefined &&
        customerEmail !== null &&
        typeof customerEmail !== "string") ||
      (customerPhone !== undefined &&
        customerPhone !== null &&
        typeof customerPhone !== "string")
    ) {
      return sendError(
        res,
        400,
        "Some enquiry details are invalid."
      );
    }

    const email = customerEmail?.trim() || "";
    const phone = customerPhone?.trim() || "";
    const enquirySubject = subject?.trim() || "General Enquiry";

    if (!email && !phone) {
      return sendError(
        res,
        400,
        "Please provide an email address or phone number."
      );
    }

    if (email.length > 254 || phone.length > 30) {
      return sendError(
        res,
        400,
        "Your contact details are too long."
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    if (enquirySubject.length > 150) {
      return sendError(
        res,
        400,
        "The enquiry subject is too long."
      );
    }

    // VERIFY THAT THE WEBSITE EXISTS AND IS PUBLISHED.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", projectId)
      .eq("status", "published")
      .maybeSingle();

    if (projectError) {
      console.error(
        "Enquiry project lookup error:",
        projectError.message
      );

      return sendError(
        res,
        500,
        "Could not verify this website."
      );
    }

    if (!project) {
      return sendError(
        res,
        404,
        "This website is not available for enquiries."
      );
    }

    // SAVE CUSTOMER ENQUIRY.
    const { data: enquiry, error: enquiryError } = await supabase
      .from("enquiries")
      .insert({
        project_id: projectId,
        customer_name: customerName.trim(),
        customer_email: email || null,
        customer_phone: phone || null,
        subject: enquirySubject,
        message: message.trim(),
      })
      .select("id, status, created_at")
      .single();

    if (enquiryError) {
      console.error(
        "Enquiry creation error:",
        enquiryError.message
      );

      return sendError(
        res,
        500,
        "Your enquiry could not be submitted."
      );
    }

    return res.status(201).json({
      success: true,
      message: "Your enquiry has been submitted successfully.",
      enquiry,
    });

  } catch (error) {
    console.error("Create enquiry error:", error.message);

    return sendError(
      res,
      500,
      "An unexpected error occurred."
    );
  }
};


// WEBSITE OWNER VIEWS ENQUIRIES
const getProjectEnquiries = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!UUID_REGEX.test(projectId)) {
      return sendError(res, 400, "Invalid project.");
    }

    // VERIFY PROJECT OWNERSHIP.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (projectError) {
      console.error(
        "Enquiry ownership lookup error:",
        projectError.message
      );

      return sendError(
        res,
        500,
        "Could not verify project ownership."
      );
    }

    if (!project) {
      return sendError(res, 404, "Project not found.");
    }

    const { data: enquiries, error: enquiriesError } = await supabase
      .from("enquiries")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (enquiriesError) {
      console.error(
        "Fetch enquiries error:",
        enquiriesError.message
      );

      return sendError(
        res,
        500,
        "Could not load enquiries."
      );
    }

    return res.json({
      success: true,
      enquiries: enquiries || [],
    });

  } catch (error) {
    console.error("Get enquiries error:", error.message);

    return sendError(
      res,
      500,
      "An unexpected error occurred."
    );
  }
};


// WEBSITE OWNER UPDATES ENQUIRY STATUS
const updateEnquiryStatus = async (req, res) => {
  try {
    const { projectId, enquiryId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "new",
      "contacted",
      "resolved",
    ];

    if (
      !UUID_REGEX.test(projectId) ||
      !UUID_REGEX.test(enquiryId)
    ) {
      return sendError(
        res,
        400,
        "Invalid project or enquiry."
      );
    }

    if (!allowedStatuses.includes(status)) {
      return sendError(
        res,
        400,
        "Invalid enquiry status."
      );
    }

    // VERIFY PROJECT OWNERSHIP.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (projectError) {
      console.error(
        "Enquiry ownership lookup error:",
        projectError.message
      );

      return sendError(
        res,
        500,
        "Could not verify project ownership."
      );
    }

    if (!project) {
      return sendError(res, 404, "Project not found.");
    }

    const { data: enquiry, error: enquiryError } = await supabase
      .from("enquiries")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiryId)
      .eq("project_id", projectId)
      .select("*")
      .maybeSingle();

    if (enquiryError) {
      console.error(
        "Update enquiry error:",
        enquiryError.message
      );

      return sendError(
        res,
        500,
        "Could not update enquiry."
      );
    }

    if (!enquiry) {
      return sendError(res, 404, "Enquiry not found.");
    }

    return res.json({
      success: true,
      message: "Enquiry status updated.",
      enquiry,
    });

  } catch (error) {
    console.error("Update enquiry error:", error.message);

    return sendError(
      res,
      500,
      "An unexpected error occurred."
    );
  }
};


module.exports = {
  createEnquiry,
  getProjectEnquiries,
  updateEnquiryStatus,
};
