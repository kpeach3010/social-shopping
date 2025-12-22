import express from "express";
import multer from "multer";
import * as OrderController from "../controllers/order.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();

router.post(
  "/checkout",
  authenticate,
  hasRoles(Role.CUSTOMER),
  OrderController.checkoutController
);
router.patch(
  "/cancel/:id",
  authenticate,
  hasRoles(Role.CUSTOMER),
  OrderController.cancelOrderController
);
router.get(
  "/my-orders",
  authenticate,
  hasRoles(Role.CUSTOMER),
  OrderController.getMyOrdersController
);
router.get(
  "/my-orders/:id",
  authenticate,
  hasRoles(Role.CUSTOMER),
  OrderController.getMyOrderByIdController
);

router.get(
  "/search",
  authenticate,
  hasRoles(Role.STAFF),
  OrderController.searchOrdersByIdController
);

router.get(
  "/overview",
  authenticate,
  hasRoles(Role.STAFF),
  OrderController.getOrdersOverviewForStaffController
);

router.patch(
  "/approve/:id",
  authenticate,
  hasRoles(Role.STAFF),
  OrderController.approveOrderController
);
router.patch(
  "/reject/:id",
  authenticate,
  hasRoles(Role.STAFF),
  OrderController.rejectOrderController
);

router.get("/:id", OrderController.getOrderWithUserInfoByIdController);

export default router;
