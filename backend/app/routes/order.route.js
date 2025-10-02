const express = require("express");
const multer = require("multer");
const upload = multer();
const {
  checkoutController,
  approveOrderController,
  rejectOrderController,
  getMyOrdersController,
  getMyOrderByIdController,
  getOrdersOverviewForStaffController,
  cancelOrderController,
} = require("../controllers/order.controller");
const { authenticate, hasRoles } = require("../middlewares/auth.middleware");
const Role = require("../enums/role.enum");

const router = express.Router();

router.use(authenticate);

router.post("/checkout", hasRoles(Role.CUSTOMER), checkoutController);
router.patch("/cancel/:id", hasRoles(Role.CUSTOMER), cancelOrderController);
router.get("/my-orders", hasRoles(Role.CUSTOMER), getMyOrdersController);
router.get("/my-orders/:id", hasRoles(Role.CUSTOMER), getMyOrderByIdController);
router.get(
  "/overview",
  hasRoles(Role.STAFF),
  getOrdersOverviewForStaffController
);
router.patch("/approve/:id", hasRoles(Role.STAFF), approveOrderController);
router.patch("/reject/:id", hasRoles(Role.STAFF), rejectOrderController);

module.exports = router;
