
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error("Admin authorization error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to verify admin access.",
      });
    }

    if (!data) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Admin authorization failed.",
    });
  }
};

module.exports = adminMiddleware;
