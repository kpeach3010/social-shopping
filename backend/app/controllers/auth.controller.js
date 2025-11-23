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
    res.status(200).json({
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const refreshTokenController = async (req, res) => {
  console.log("\n=== [CONTROLLER] REFRESH TOKEN CALLED ===");
  console.log("Body nhận:", req.body);

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      console.warn("⚠️ Missing refreshToken");
      return res.status(400).json({ error: "Missing refresh token" });
    }

    const { session, user } = await refreshTokenService(refreshToken);

    console.log("===== REFRESH RESPONSE RAW =====");
    console.log({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user,
    });

    return res.status(200).json({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user,
    });
  } catch (err) {
    console.error("❌ [REFRESH ERROR]:", err.message);
    return res.status(401).json({ error: err.message });
  }
};
