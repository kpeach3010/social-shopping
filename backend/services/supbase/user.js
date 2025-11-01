import supabase from "./client.js";
import { Role } from "../../app/enums/role.enum.js";

// taot user tren supabase
export const createUser = async (userData) => {
  try {
    // 1) Tạo user trên Supabase Auth
    const response = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        role: userData.role || Role.CUSTOMER,
        full_name: userData.fullName || null,
        phone: userData.phone || null,
        gender: userData.gender || null,
        date_of_birth: userData.dateOfBirth || null,
      },
    });
    if (response.error) {
      throw response.error;
    }
    return response.data.user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user");
  }
};

export const disableUserService = async (userId) => {
  try {
    // Kiểm tra user tồn tại
    const [user] = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Nếu đã disabled thì không cần làm lại
    if (user.status === "disabled") {
      return { message: "Tài khoản đã bị vô hiệu hóa trước đó" };
    }

    // Cập nhật status = disabled
    await db
      .update(users)
      .set({ status: "disabled" })
      .where(eq(users.id, userId));

    return { message: "Tài khoản đã bị vô hiệu hóa thành công" };
  } catch (error) {
    console.error("Error disabling user:", error);
    throw new Error("Failed to disable user");
  }
};
