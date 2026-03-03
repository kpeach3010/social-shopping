import {
  addToCartService,
  removeFromCartService,
  removeMultipleFromCartService,
  getCartItemsService,
  updateCartItemQuantityService,
} from "../services/cart.service.js";

// Thêm variant vào cart
export const addToCartController = async (req, res) => {
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
export const removeFromCartController = async (req, res) => {
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

// Xóa nhiều variants cùng lúc
export const removeMultipleFromCartController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { variantIds } = req.body;

    if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
      return res.status(400).json({ error: "variantIds array is required" });
    }

    const result = await removeMultipleFromCartService(userId, variantIds);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getCartItemsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await getCartItemsService(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Tăng hoặc giảm số lượng variant trong cart
export const updateCartItemQuantityController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { variantId } = req.params;
    const { action, targetQuantity } = req.body; // Support targetQuantity for optimistic updates

    if (!variantId || !action) {
      return res.status(400).json({ error: "variantId và action là bắt buộc" });
    }

    const result = await updateCartItemQuantityService(
      userId,
      variantId,
      action,
      targetQuantity,
    );

    res.status(200).json({
      message: "Cart item updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
