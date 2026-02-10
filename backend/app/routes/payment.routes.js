import { Router } from "express";
import {
  createMomoPaymentUrl,
  checkMomoReturn,
  createVnpayPaymentUrl,
  vnpayReturn,
  createPaypalPaymentUrl,
  paypalReturn,
  checkPaypalOrderStatus,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/momo/create", createMomoPaymentUrl);
router.get("/momo/return", checkMomoReturn);
router.post("/momo/return", checkMomoReturn);
router.post("/vnpay/create", createVnpayPaymentUrl);
router.get("/vnpay/return", vnpayReturn);

// PayPal
router.post("/paypal/create", createPaypalPaymentUrl);
router.get("/paypal/return", paypalReturn);
router.get("/paypal/check-status/:orderId", checkPaypalOrderStatus);

export default router;
