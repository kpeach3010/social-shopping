const express = require("express");
const UserController = require("../controllers/user.controller");
const { authenticate, hasRoles } = require("../middlewares/auth.middleware");
const Role = require("../enums/role.enum");

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

module.exports = router;
