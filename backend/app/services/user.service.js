// user.service.js
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createUser } from "../../services/supbase/user.js";
import { Role } from "../enums/role.enum.js";

// util: kiểm tra 'YYYY-MM-DD'
function isYYYYMMDD(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// optional: normalize gender về enum ['male','female']
function normalizeGender(g) {
  if (!g) return null;
  const v = String(g).toLowerCase();
  if (["male", "female"].includes(v)) return v;
  return null;
}

export const checkUserAdminExists = async () => {
  const adminUser = await db
    .select()
    .from(users)
    .where(eq(users.role, Role.ADMIN))
    .limit(1);
  return adminUser.length > 0;
};

export const createUserService = async (data) => {
  try {
    // 1) Tạo user trên Supabase Auth
    const supabaseUser = await createUser({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone || null,
      gender: data.gender || null,
      dateOfBirth: data.dateOfBirth || null,
      role: data.role || Role.CUSTOMER,
    });

    // 2) Chuẩn hóa dữ liệu cho Drizzle
    const payload = {
      id: supabaseUser.id, // đồng bộ id giữa Auth và DB
      email: data.email,
      fullName: data.fullName ?? null,
      phone: data.phone ?? null,
      gender: normalizeGender(data.gender), // 'male' | 'female'
      dateOfBirth: null,
      province: data.province ?? null,
      district: data.district ?? null,
      ward: data.ward ?? null,
      addressDetail: data.addressDetail ?? null,
      role: data.role,
    };

    // CỘT date: bắt buộc 'YYYY-MM-DD' (string)
    if (data.dateOfBirth) {
      if (!isYYYYMMDD(data.dateOfBirth)) {
        // có thể throw 400 tùy controller
        throw new Error("dateOfBirth must be 'YYYY-MM-DD'");
      }
      payload.dateOfBirth = data.dateOfBirth;
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

export const createStaffService = async (data) => {
  try {
    // 1) Tạo user trên Supabase Auth
    const supabaseUser = await createUser({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone || null,
      gender: data.gender || null,
      dateOfBirth: data.dateOfBirth || null,
      role: Role.STAFF,
    });

    // 2) Chuẩn hóa dữ liệu cho Drizzle
    const payload = {
      id: supabaseUser.id, // đồng bộ id giữa Auth và DB
      email: data.email,
      fullName: data.fullName ?? null,
      phone: data.phone ?? null,
      gender: normalizeGender(data.gender), // 'male' | 'female'
      dateOfBirth: null,
      province: data.province ?? null,
      district: data.district ?? null,
      ward: data.ward ?? null,
      addressDetail: data.addressDetail ?? null,
      role: Role.STAFF,
    };

    // CỘT date: bắt buộc 'YYYY-MM-DD' (string)
    if (data.dateOfBirth) {
      if (!isYYYYMMDD(data.dateOfBirth)) {
        // có thể throw 400 tùy controller
        throw new Error("dateOfBirth must be 'YYYY-MM-DD'");
      }
      payload.dateOfBirth = data.dateOfBirth;
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

export const disableUserService = async (id) => {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!user) {
    throw new Error("Tài khoản không tồn tại");
  }

  if (user.status === "disabled") {
    return { message: "Tài khoản đã bị vô hiệu hóa trước đó" };
  }

  await db.update(users).set({ status: "disabled" }).where(eq(users.id, id));

  return { message: "Tài khoản đã bị vô hiệu hóa thành công" };
};

export const enableUserService = async (id) => {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!user) {
    throw new Error("Tài khoản không tồn tại");
  }

  if (user.status === "active") {
    return { message: "Tài khoản đã đang hoạt động" };
  }

  await db.update(users).set({ status: "active" }).where(eq(users.id, id));

  return { message: "Tài khoản đã được khôi phục thành công" };
};

// lay tat ca user
export const getAllUsersService = async () => {
  return await db.select().from(users);
};

// Cap nhat thong tin user
export const updateUserService = async (userId, payload) => {
  const allowedFields = [
    "fullName",
    "phone",
    "gender",
    "dateOfBirth",
    "province",
    "district",
    "ward",
    "addressDetail",
  ];

  // Lọc dữ liệu hợp lệ
  const data = {};
  for (const key of allowedFields) {
    if (payload[key] !== undefined) {
      data[key] = payload[key];
    }
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Không có dữ liệu hợp lệ để cập nhật.");
  }

  data.updatedAt = new Date();

  const updated = await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      gender: users.gender,
      dateOfBirth: users.dateOfBirth,
      province: users.province,
      district: users.district,
      ward: users.ward,
      addressDetail: users.addressDetail,
      updatedAt: users.updatedAt,
    });

  return updated[0];
};
