import express from "express";
import multer from "multer";
const upload = multer();
import * as OrderController from "../controllers/order.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/checkout",
  hasRoles(Role.CUSTOMER),
  OrderController.checkoutController
);
router.patch(
  "/cancel/:id",
  hasRoles(Role.CUSTOMER),
  OrderController.cancelOrderController
);
router.get(
  "/my-orders",
  hasRoles(Role.CUSTOMER),
  OrderController.getMyOrdersController
);
router.get(
  "/my-orders/:id",
  hasRoles(Role.CUSTOMER),
  OrderController.getMyOrderByIdController
);

router.get(
  "/search",
  hasRoles(Role.STAFF),
  OrderController.searchOrdersByIdController
);

router.get(
  "/overview",
  hasRoles(Role.STAFF),
  OrderController.getOrdersOverviewForStaffController
);
router.get("/:id", OrderController.getOrderWithUserInfoByIdController);
router.patch(
  "/approve/:id",
  hasRoles(Role.STAFF),
  OrderController.approveOrderController
);
router.patch(
  "/reject/:id",
  hasRoles(Role.STAFF),
  OrderController.rejectOrderController
);

export default router;
