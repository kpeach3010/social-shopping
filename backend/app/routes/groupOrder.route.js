import express from "express";
import * as GroupOrderController from "../controllers/groupOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/:conversationId",
  authenticate,
  GroupOrderController.getGroupOrderDetailController
);

// router.patch(
//   "/:groupOrderId/choose",
//   authenticate,
//   GroupOrderController.chooseVariantController
// );

router.patch(
  "/:id/checkout",
  authenticate,
  GroupOrderController.groupOrderCheckoutController
);

router.patch(
  "/:groupOrderId/leave",
  authenticate,
  GroupOrderController.leaveGroupOrderController
);

router.post(
  "/:groupOrderId/select-items",
  authenticate,
  GroupOrderController.selectItemsController
);

export default router;
