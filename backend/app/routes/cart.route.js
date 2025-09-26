const express = require("express");
const {
  addToCartController,
  removeFromCartController,
  getCartItemsController,
  updateCartItemQuantityController,
} = require("../controllers/cart.controller");
const { authenticate, hasRoles } = require("../middlewares/auth.middleware");
const Role = require("../enums/role.enum");

const router = express.Router();

router.use(authenticate);

router.post("/add", addToCartController);
router.delete("/remove/:variantId", removeFromCartController);
router.patch("/update-quantity/:variantId", updateCartItemQuantityController);
router.get("/get-cart-items", getCartItemsController);

module.exports = router;
