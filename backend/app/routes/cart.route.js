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

router.post("/add", hasRoles(Role.CUSTOMER), addToCartController);
router.delete(
  "/remove/:variantId",
  hasRoles(Role.CUSTOMER),
  removeFromCartController
);
router.patch(
  "/update-quantity/:variantId",
  hasRoles(Role.CUSTOMER),
  updateCartItemQuantityController
);
router.get("/get-cart-items", hasRoles(Role.CUSTOMER), getCartItemsController);

module.exports = router;
