const {
  createCouponService,
  getAllCouponsService,
  getValidCouponsService,
  getAvailableCouponsForProductsService,
  deleteCouponService,
  updateCouponService,
} = require("../services/coupon.service");

exports.createCouponController = async (req, res) => {
  try {
    const data = req.body;
    const newCoupon = await createCouponService(data);
    res.status(201).json(newCoupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllCouponsController = async (req, res) => {
  try {
    const coupons = await getAllCouponsService();
    res.status(200).json(coupons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getValidCouponsController = async (req, res) => {
  try {
    const coupons = await getValidCouponsService();
    res.status(200).json(coupons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCouponsForProductsController = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Danh sách productIds là bắt buộc" });
    }

    const coupons = await getAvailableCouponsForProductsService(productIds);

    return res.status(200).json({
      coupons, // danh sách coupon kèm field applicable: true/false
    });
  } catch (error) {
    console.error("Error fetching coupons for products:", error);
    return res.status(500).json({
      error: "Lỗi khi lấy coupon",
      details: error.message,
    });
  }
};

exports.deleteCouponController = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await deleteCouponService(id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateCouponController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCoupon = await updateCouponService(id, req.body);
    res.json(updatedCoupon);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
