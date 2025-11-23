import { createClient } from "@supabase/supabase-js";

// Client backend dùng service_role để verify token
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Không có Token" });
    }

    const token = authHeader.split(" ")[1];

    // Kiểm tra accessToken với Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.error("Supabase verify error:", error);
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    // Lưu user Supabase vào req
    req.user = data.user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Kiểm tra quyền dựa trên user_metadata.role
export const hasRoles = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.user_metadata?.role;

    if (!role) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Chỉ admin mới được phép" });
    }

    next();
  };
};
