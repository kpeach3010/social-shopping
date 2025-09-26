const express = require("express");
const {
  createCouponController,
  getAllCouponsController,
  getValidCouponsController,
  getCouponsForProductsController,
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
router.get("/valid-coupons", getValidCouponsController);
router.get("/available", getCouponsForProductsController);
router.delete(
  "/delete-coupon/:id",
  authenticate,
  hasRoles(Role.STAFF),
  deleteCouponController
);
router.patch(
  "/update-coupon/:id",
  authenticate,
  hasRoles(Role.STAFF),
  updateCouponController
);

module.exports = router;
