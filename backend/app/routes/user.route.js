const express = require("express");
const {
  createStaffController,
  disableUserController,
  enableUserController,
  getAllUsersController,
} = require("../controllers/user.controller");
const { authenticate, hasRoles } = require("../middlewares/auth.middleware");
const Role = require("../enums/role.enum");

const router = express.Router();

router.use(authenticate);

router.post("/create-staff", hasRoles(Role.ADMIN), createStaffController);
router.patch("/disable/:id", hasRoles(Role.ADMIN), disableUserController);

router.patch("/enable/:id", hasRoles(Role.ADMIN), enableUserController);
router.get("/", getAllUsersController);
module.exports = router;
