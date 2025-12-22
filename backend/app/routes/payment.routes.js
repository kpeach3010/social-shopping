import { Router } from "express";
import {
  createMomoPaymentUrl,
  checkMomoReturn,
  createVnpayPaymentUrl,
  vnpayReturn,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/momo/create", createMomoPaymentUrl);
router.get("/momo/return", checkMomoReturn);
router.post("/momo/return", checkMomoReturn);
router.post("/vnpay/create", createVnpayPaymentUrl);
router.get("/vnpay/return", vnpayReturn);

export default router;
