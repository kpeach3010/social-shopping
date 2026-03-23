import express from "express";
import * as GroupOrderController from "../controllers/groupOrder.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();

router.get(
  "/:conversationId",
  authenticate,
  GroupOrderController.getGroupOrderDetailController,
);

// router.patch(
//   "/:groupOrderId/choose",
//   authenticate,
//   GroupOrderController.chooseVariantController
// );

router.patch(
  "/:id/checkout",
  authenticate,
  hasRoles(Role.CUSTOMER),
  GroupOrderController.groupOrderCheckoutController,
);

router.patch(
  "/:groupOrderId/leave",
  authenticate,
  hasRoles(Role.CUSTOMER),
  GroupOrderController.leaveGroupController,
);

router.post(
  "/:groupOrderId/select-items",
  authenticate,
  hasRoles(Role.CUSTOMER),
  GroupOrderController.selectItemsController,
);

router.patch(
  "/:id/cancel",
  authenticate,
  hasRoles(Role.CUSTOMER),
  GroupOrderController.cancelGroupOrderController,
);

router.patch(
  "/:groupOrderId/change-product",
  authenticate,
  hasRoles(Role.CUSTOMER),
  GroupOrderController.changeGroupOrderProductController,
);

router.patch(
  "/:groupOrderId/change-payment-method",
  authenticate,
  hasRoles(Role.CUSTOMER),
  GroupOrderController.changeGroupOrderPaymentMethodController,
);

router.delete(
  "/:id/disband",
  authenticate,
  hasRoles(Role.CUSTOMER),
  GroupOrderController.disbandGroupOrderController,
);

export default router;
