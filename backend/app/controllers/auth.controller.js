import {
  registerService,
  loginService,
  refreshTokenService,
} from "../services/auth.service.js";

export const registerController = async (req, res) => {
  try {
    const registerData = req.body;
    const newUser = await registerService(registerData);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const response = await loginService({ email, password });
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const refreshTokenController = async (req, res) => {
  console.log("📩 [Controller] /auth/refresh-token được gọi!");
  console.log("🧾 req.body:", req.body);

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      console.warn("⚠️ [Controller] Thiếu refreshToken trong request body.");
      return res.status(400).json({ error: "Missing refresh token" });
    }

    // Gọi service để làm mới token từ Supabase
    const { session, user } = await refreshTokenService(refreshToken);

    console.log("✅ [Controller] Supabase session:", session);
    console.log("✅ [Controller] Supabase user:", user);

    if (!session?.access_token) {
      console.error("❌ [Controller] Không có access_token trong session.");
      return res.status(401).json({ error: "No access token returned" });
    }

    // Trả về đúng format mà frontend đang mong đợi
    return res.status(200).json({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user,
    });
  } catch (err) {
    console.error("🔥 [Controller] Refresh token error:", err);
    return res
      .status(401)
      .json({ error: err.message || "Token refresh failed" });
  }
};
