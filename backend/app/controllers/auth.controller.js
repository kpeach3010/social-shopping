const { registerService, loginService } = require("../services/auth.service");

exports.registerController = async (req, res) => {
  try {
    const registerData = req.body;
    const newUser = await registerService(registerData);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const response = await loginService({ email, password });
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
