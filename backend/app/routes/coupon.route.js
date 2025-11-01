import express from "express";
import * as CouponController from "../controllers/coupon.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();

// tao 1 coupon
router.post(
  "/create-coupon",
  authenticate,
  hasRoles(Role.STAFF),
  CouponController.createCouponController
);

router.get("/all-coupons", CouponController.getAllCouponsController);
router.get(
  "/valid-coupons",
  authenticate,
  CouponController.getValidCouponsController
);
router.get(
  "/available",
  authenticate,
  CouponController.getAvailableCouponsController
);
router.delete(
  "/delete-coupon/:ids",
  authenticate,
  CouponController.deleteCouponController
);
router.patch(
  "/update-coupon/:id",
  authenticate,
  hasRoles(Role.STAFF),
  CouponController.updateCouponController
);

export default router;
