import {
  createCouponService,
  getAllCouponsService,
  getValidCouponsService,
  getAvailableCouponsForProductsService,
  deleteCouponService,
  updateCouponService,
} from "../services/coupon.service.js";

export const createCouponController = async (req, res) => {
  try {
    const data = req.body;
    const newCoupon = await createCouponService(data);
    res.status(201).json(newCoupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllCouponsController = async (req, res) => {
  try {
    const coupons = await getAllCouponsService();
    res.status(200).json(coupons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getValidCouponsController = async (req, res) => {
  try {
    const userId = req.user?.id; // lấy từ token hoặc session
    const coupons = await getValidCouponsService(userId);
    res.status(200).json(coupons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAvailableCouponsController = async (req, res) => {
  try {
    let productIds = [];
    let variantIds = [];

    if (req.query.productIds) {
      productIds = req.query.productIds.split(",");
    }

    if (req.query.variantIds) {
      variantIds = req.query.variantIds.split(",");
    }

    const userId = req.user?.id; // thêm userId để check perUserLimit

    const data = await getAvailableCouponsForProductsService({
      productIds,
      variantIds,
      userId,
      onlyApplicable: true,
    });

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// xóa 1 hoặc nhiều coupon
export const deleteCouponController = async (req, res) => {
  try {
    let ids = [];
    if (req.method === "DELETE" && req.body && Array.isArray(req.body.ids)) {
      ids = req.body.ids;
    } else if (req.params.ids) {
      // Hỗ trợ /delete-many/:ids (id1,id2,id3)
      ids = req.params.ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    } else if (req.params.id) {
      ids = [req.params.id];
    }
    if (!ids.length)
      return res.status(400).json({ error: "No coupon id(s) provided" });
    const result = await deleteCouponService(ids);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateCouponController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCoupon = await updateCouponService(id, req.body);
    res.json(updatedCoupon);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
