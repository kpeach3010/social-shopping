import express from "express";
import * as GroupOrderController from "../controllers/groupOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

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
  GroupOrderController.groupOrderCheckoutController,
);

router.patch(
  "/:groupOrderId/leave",
  authenticate,
  GroupOrderController.leaveGroupController,
);

router.post(
  "/:groupOrderId/select-items",
  authenticate,
  GroupOrderController.selectItemsController,
);

router.patch(
  "/:id/cancel",
  authenticate,
  GroupOrderController.cancelGroupOrderController,
);

router.patch(
  "/:groupOrderId/change-product",
  authenticate,
  GroupOrderController.changeGroupOrderProductController,
);

router.patch(
  "/:groupOrderId/change-payment-method",
  authenticate,
  GroupOrderController.changeGroupOrderPaymentMethodController,
);

router.delete(
  "/:id/disband",
  authenticate,
  GroupOrderController.disbandGroupOrderController,
);

export default router;
