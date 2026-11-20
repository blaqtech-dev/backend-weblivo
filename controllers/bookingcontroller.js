
const supabase = require("../config/supabase");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });


// CUSTOMER SUBMITS A BOOKING
const createBooking = async (req, res) => {
  try {
    const {
      projectId,
      customerName,
      customerEmail,
      customerPhone,
      serviceName,
      bookingDate,
      bookingTime,
      message,
    } = req.body;

    if (
      !projectId ||
      !customerName ||
      !customerPhone ||
      !serviceName ||
      !bookingDate ||
      !bookingTime
    ) {
      return sendError(res, 400, "Please complete all required booking fields.");
    }

    if (!UUID_REGEX.test(projectId)) {
      return sendError(res, 400, "Invalid project.");
    }

    if (
      typeof customerName !== "string" ||
      customerName.trim().length > 100 ||
      typeof customerPhone !== "string" ||
      customerPhone.trim().length > 30 ||
      typeof serviceName !== "string" ||
      serviceName.trim().length > 150 ||
      (customerEmail && (
        typeof customerEmail !== "string" ||
        customerEmail.length > 254
      )) ||
      (message && (
        typeof message !== "string" ||
        message.length > 1000
      ))
    ) {
      return sendError(res, 400, "Some booking details are invalid or too long.");
    }

    if (
      !DATE_REGEX.test(bookingDate) ||
      Number.isNaN(Date.parse(`${bookingDate}T00:00:00Z`)) ||
      new Date(`${bookingDate}T00:00:00Z`).toISOString().slice(0, 10) !== bookingDate
    ) {
      return sendError(res, 400, "Please provide a valid booking date.");
    }

    if (bookingDate < new Date().toISOString().slice(0, 10)) {
      return sendError(res, 400, "You cannot book a date in the past.");
    }

    if (!TIME_REGEX.test(bookingTime)) {
      return sendError(res, 400, "Please provide a valid booking time.");
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return sendError(res, 400, "Please provide a valid email address.");
    }

    // Confirm that the website exists and is published.
 const { data: project, error: projectError } = await supabase
  .from("projects")
  .select("id, status, site_data")
  .eq("id", projectId)
  .eq("status", "published")
  .maybeSingle();

    if (projectError) {
      console.error("Booking project lookup error:", projectError.message);
      return sendError(res, 500, "Could not verify this website.");
    }

   if (!project) {
  return sendError(res, 404, "This website is not available for bookings.");
}

const businessType = String(
  project.site_data?.business_type || ""
).toLowerCase();

const bookingBusinessTypes = [
  "salon",
  "beauty",
  "photography",
  "consulting",
  "tutoring",
  "education",
  "spa",
  "fitness",
  "healthcare",
];

const bookingEnabled = bookingBusinessTypes.some((type) =>
  businessType.includes(type)
);

if (!bookingEnabled) {
  return sendError(
    res,
    403,
    "Appointment bookings are not enabled for this website."
  );
}

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        project_id: projectId,
        customer_name: customerName.trim(),
        customer_email: customerEmail?.trim() || null,
        customer_phone: customerPhone.trim(),
        service_name: serviceName.trim(),
        booking_date: bookingDate,
        booking_time: bookingTime,
        message: message?.trim() || null,
      })
      .select("id, status, created_at")
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError.message);
      return sendError(res, 500, "Your booking could not be submitted.");
    }

    return res.status(201).json({
      success: true,
      message: "Your booking request has been submitted.",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error.message);
    return sendError(res, 500, "An unexpected error occurred.");
  }
};


// WEBSITE OWNER VIEWS BOOKINGS
const getProjectBookings = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!UUID_REGEX.test(projectId)) {
      return sendError(res, 400, "Invalid project.");
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (projectError) {
      console.error("Booking ownership lookup error:", projectError.message);
      return sendError(res, 500, "Could not verify project ownership.");
    }

    if (!project) {
      return sendError(res, 404, "Project not found.");
    }

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("project_id", projectId)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true });

    if (bookingsError) {
      console.error("Fetch bookings error:", bookingsError.message);
      return sendError(res, 500, "Could not load bookings.");
    }

    return res.json({
      success: true,
      bookings: bookings || [],
    });
  } catch (error) {
    console.error("Get bookings error:", error.message);
    return sendError(res, 500, "An unexpected error occurred.");
  }
};


// WEBSITE OWNER UPDATES BOOKING STATUS
const updateBookingStatus = async (req, res) => {
  try {
    const { projectId, bookingId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "cancelled",
      "completed",
    ];

    if (
      !UUID_REGEX.test(projectId) ||
      !UUID_REGEX.test(bookingId)
    ) {
      return sendError(res, 400, "Invalid project or booking.");
    }

    if (!allowedStatuses.includes(status)) {
      return sendError(res, 400, "Invalid booking status.");
    }

    // Verify that this project belongs to the logged-in user.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (projectError) {
      console.error("Booking ownership lookup error:", projectError.message);
      return sendError(res, 500, "Could not verify project ownership.");
    }

    if (!project) {
      return sendError(res, 404, "Project not found.");
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("project_id", projectId)
      .select("*")
      .maybeSingle();

    if (bookingError) {
      console.error("Update booking error:", bookingError.message);
      return sendError(res, 500, "Could not update booking.");
    }

    if (!booking) {
      return sendError(res, 404, "Booking not found.");
    }

    return res.json({
      success: true,
      message: "Booking status updated.",
      booking,
    });
  } catch (error) {
    console.error("Update booking error:", error.message);
    return sendError(res, 500, "An unexpected error occurred.");
  }
};


module.exports = {
  createBooking,
  getProjectBookings,
  updateBookingStatus,
};
