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
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    // Gọi service đã query database
    const { session, user } = await refreshTokenService(refreshToken);

    return res.status(200).json({
      user, // user lấy từ DB
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  } catch (err) {
    return res.status(401).json({
      error: err.message || "Token refresh failed",
    });
  }
};
