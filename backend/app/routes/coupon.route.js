const express = require("express");
const {
  createCouponController,
  getAllCouponsController,
  getValidCouponsController,
  getAvailableCouponsController,
  deleteCouponController,
  updateCouponController,
} = require("../controllers/coupon.controller");
const { authenticate, hasRoles } = require("../middlewares/auth.middleware");
const Role = require("../enums/role.enum");

const router = express.Router();

// tao 1 coupon
router.post(
  "/create-coupon",
  authenticate,
  hasRoles(Role.STAFF),
  createCouponController
);

router.get("/all-coupons", getAllCouponsController);
router.get("/valid-coupons", authenticate, getValidCouponsController);
router.get("/available", authenticate, getAvailableCouponsController);
router.delete("/delete-coupon/:ids", authenticate, deleteCouponController);
router.patch(
  "/update-coupon/:id",
  authenticate,
  hasRoles(Role.STAFF),
  updateCouponController
);

module.exports = router;
