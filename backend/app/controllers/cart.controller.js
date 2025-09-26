const {
  addToCartService,
  removeFromCartService,
  getCartItemsService,
  updateCartItemQuantityService,
} = require("../services/cart.service");

// Thêm variant vào cart
exports.addToCartController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { variantId, quantity } = req.body;
    if (!variantId || !quantity) {
      return res
        .status(400)
        .json({ error: "variantId và quantity là bắt buộc" });
    }
    const result = await addToCartService(userId, variantId, quantity);
    res.status(201).json({
      message: "Product added to cart successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Xóa 1 variant ra khỏi cart
exports.removeFromCartController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { variantId } = req.params;

    if (!variantId) {
      return res.status(400).json({ error: "variantId is required" });
    }

    const result = await removeFromCartService(userId, variantId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCartItemsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await getCartItemsService(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Tăng hoặc giảm số lượng variant trong cart
exports.updateCartItemQuantityController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { variantId } = req.params;
    const { action } = req.body; // "increase" | "decrease"

    if (!variantId || !action) {
      return res.status(400).json({ error: "variantId và action là bắt buộc" });
    }

    const result = await updateCartItemQuantityService(
      userId,
      variantId,
      action
    );

    res.status(200).json({
      message: "Cart item updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
