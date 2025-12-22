import { Router } from "express";
import {
  createMomoPaymentUrl,
  checkMomoReturn,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/momo/create", createMomoPaymentUrl);
router.get("/momo/return", checkMomoReturn);
router.post("/momo/return", checkMomoReturn);

export default router;
