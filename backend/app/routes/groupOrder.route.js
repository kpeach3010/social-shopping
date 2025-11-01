import express from "express";
import * as GroupOrderController from "../controllers/groupOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/:conversationId",
  authenticate,
  GroupOrderController.getGroupOrderDetailController
);

export default router;
