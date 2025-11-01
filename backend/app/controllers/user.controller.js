import {
  createStaffService,
  disableUserService,
  enableUserService,
  getAllUsersService,
} from "../services/user.service.js";

export const createStaffController = async (req, res) => {
  try {
    const data = req.body;
    const newUser = await createStaffService(data);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const disableUserController = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await disableUserService(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const enableUserController = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await enableUserService(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const allUsers = await getAllUsersService();
    res.json(allUsers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
