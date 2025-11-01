import express from "express";
import * as CartController from "../controllers/cart.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/add",
  hasRoles(Role.CUSTOMER),
  CartController.addToCartController
);
router.delete(
  "/remove/:variantId",
  hasRoles(Role.CUSTOMER),
  CartController.removeFromCartController
);
router.patch(
  "/update-quantity/:variantId",
  hasRoles(Role.CUSTOMER),
  CartController.updateCartItemQuantityController
);
router.get(
  "/get-cart-items",
  hasRoles(Role.CUSTOMER),
  CartController.getCartItemsController
);

export default router;
