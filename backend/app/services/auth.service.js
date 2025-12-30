// auth.service.js
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { register, login } from "../../services/supbase/auth.js";
import { Role } from "../enums/role.enum.js";
import supabase, { supabaseAuth } from "../../services/supbase/client.js";

// util: kiểm tra 'YYYY-MM-DD'
function isYYYYMMDD(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// optional: normalize gender về enum ['male','female','other']
function normalizeGender(g) {
  if (!g) return null;
  const v = String(g).toLowerCase();
  if (["male", "female"].includes(v)) return v;
  return null;
}

export const registerService = async (registerData) => {
  try {
    // Kiểm tra email đã tồn tại chưa
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, registerData.email));
    if (existingUser) {
      throw new Error("Email đã tồn tại, vui lòng dùng email khác.");
    }

    // 1) Tạo user trên Supabase Auth
    const supabaseUser = await register(
      registerData.email,
      registerData.password,
      {
        // metadata
        phone: registerData.phone,
        fullName: registerData.fullName, // metadata
        role: Role.CUSTOMER, // tất cả user đăng ký đều là 'customer'
      }
    );

    // 2) Chuẩn hóa dữ liệu cho Drizzle
    const payload = {
      id: supabaseUser.id, // đồng bộ id giữa Auth và DB
      email: registerData.email,
      fullName: registerData.fullName ?? null,
      phone: registerData.phone ?? null,
      gender: normalizeGender(registerData.gender), // 'male' | 'female'
      dateOfBirth: null,
      province: registerData.province ?? null,
      district: registerData.district ?? null,
      ward: registerData.ward ?? null,
      addressDetail: registerData.addressDetail ?? null,
      role: Role.CUSTOMER, // tất cả user đăng ký đều là 'customer'
    };

    // CỘT date: bắt buộc 'YYYY-MM-DD' (string)
    if (registerData.dateOfBirth) {
      if (!isYYYYMMDD(registerData.dateOfBirth)) {
        // có thể throw 400 tùy controller
        throw new Error("dateOfBirth must be 'YYYY-MM-DD'");
      }
      payload.dateOfBirth = registerData.dateOfBirth;
    }
    console.log("Final Payload gửi vào DB:", payload);

    // 3) Ghi vào bảng users bằng Drizzle
    const inserted = await db.insert(users).values(payload).returning();

    // 4) Trả về user vừa tạo
    return inserted[0];
  } catch (error) {
    throw error;
  }
};

export const loginService = async (loginData) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, loginData.email));

    if (!user) {
      throw new Error("Tài khoản không tồn tại");
    }

    if (user.status === "disabled") {
      throw new Error("Tài khoản của bạn đang bị vô hiệu hóa");
    }

    const { accessToken, refreshToken, supabaseUser } = await login(
      loginData.email,
      loginData.password
    );

    // Chặn đăng nhập nếu chưa xác thực email
    if (!supabaseUser?.email_confirmed_at) {
      throw new Error("Email chưa được xác thực. Vui lòng kiểm tra hộp thư.");
    }

    return { user: user, accessToken, refreshToken };
  } catch (e) {
    const msg = e?.message || "";

    // Map lỗi Supabase về tiếng Việt
    if (
      typeof msg === "string" &&
      msg.toLowerCase().includes("email not confirmed")
    ) {
      throw new Error("Email chưa được xác thực. Vui lòng kiểm tra email.");
    }

    // Nếu Supabase trả lỗi chung thử kiểm tra trạng thái xác thực email
    try {
      const { data: userByEmail } = await supabase.auth.admin.getUserByEmail(
        loginData.email
      );
      if (userByEmail && !userByEmail.email_confirmed_at) {
        throw new Error("Email chưa được xác thực. Vui lòng kiểm tra email.");
      }
    } catch (adminErr) {
      // Nếu kiểm tra admin lỗi, bỏ qua và ném lỗi gốc
    }

    // Map lỗi tiếng Anh phổ biến sang tiếng Việt
    if (
      typeof msg === "string" &&
      msg.toLowerCase().includes("invalid login credentials")
    ) {
      throw new Error("Email hoặc mật khẩu không chính xác");
    }

    // Nếu thông báo đã là tiếng Việt (có ký tự non-ASCII), giữ nguyên
    if (/[^\u0000-\u007f]/.test(msg)) {
      throw e;
    }

    // Fallback chung
    throw new Error("Email hoặc mật khẩu không chính xác");
  }
};
export const refreshTokenService = async (refreshToken) => {
  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) throw new Error("Invalid refresh token");
  if (!data || !data.session || !data.user) {
    throw new Error("Supabase không trả về session hoặc user");
  }

  const { session, user } = data;

  // Query user từ DB theo đúng ID của Supabase Auth
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));

  if (!dbUser) {
    throw new Error("User không tồn tại trong database");
  }

  return {
    session,
    user: dbUser,
  };
};
