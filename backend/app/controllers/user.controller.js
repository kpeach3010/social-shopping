const {
  createStaffService,
  disableUserService,
  enableUserService,
} = require("../services/user.service");

exports.createStaffController = async (req, res) => {
  try {
    const data = req.body;
    const newUser = await createStaffService(data);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.disableUserController = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await disableUserService(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.enableUserController = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await enableUserService(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
