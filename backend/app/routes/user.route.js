import express from "express";
import * as UserController from "../controllers/user.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/create-staff",
  hasRoles(Role.ADMIN),
  UserController.createStaffController
);
router.patch(
  "/disable/:id",
  hasRoles(Role.ADMIN),
  UserController.disableUserController
);

router.patch(
  "/enable/:id",
  hasRoles(Role.ADMIN),
  UserController.enableUserController
);

router.patch("/profile", authenticate, UserController.updateUserController);
router.get("/", UserController.getAllUsersController);
export default router;
