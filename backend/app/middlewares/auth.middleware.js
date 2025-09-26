import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import ApiError from "../api-error.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Kiểm tra header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Không có Token" });
    }

    const token = authHeader.split(" ")[1];

    // Giải mã token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Lấy userId từ payload token
    const userId = decoded.sub;

    // Truy vấn DB lấy user
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const user = foundUsers[0];

    if (!user) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    // Gắn user vào request
    req.user = user;

    next(); // tiếp tục đến handler tiếp theo
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const hasRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
};
