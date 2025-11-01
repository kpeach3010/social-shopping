import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import ApiError from "../api-error.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🔑 JWT_SECRET length:", JWT_SECRET?.length);
    console.log("🔑 JWT_SECRET preview:", JWT_SECRET?.slice(0, 10));

    // Kiểm tra header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Không có Token" });
    }

    const token = authHeader.split(" ")[1];
    if (token) console.log("🪪 Token preview:", token.slice(0, 20));
    else console.log("🪪 Token missing in header");

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
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token đã hết hạn" });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

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
