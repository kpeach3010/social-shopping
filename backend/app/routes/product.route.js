import express from "express";
import multer from "multer";

import * as ProductController from "../controllers/product.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();
const upload = multer();
// Tạo sản phẩm mới (chỉ staff)
router.post(
  "/create-product",
  authenticate,
  hasRoles(Role.STAFF),
  upload.any(),
  ProductController.createProductController
);

// Lấy tất cả sản phẩm
router.get("/all-products", ProductController.getAllProductController);

// Lấy sản phẩm theo ID
router.get("/get-product/:id", ProductController.getProductByIdController);

// Lấy sản phẩm theo giá
router.get(
  "/products-by-price",
  ProductController.getProductsByPriceController
);

// Xóa 1 sản phẩm
router.delete(
  "/delete-many/:ids",
  authenticate,
  hasRoles(Role.STAFF),
  ProductController.deleteProductController
);

// Xóa 1 variant
router.delete(
  "/delete-variant/:id",
  authenticate,
  hasRoles(Role.STAFF),
  ProductController.deleteVariantController
);

router.put(
  "/update-product/:id",
  authenticate,
  hasRoles(Role.STAFF),
  upload.any(),
  ProductController.updateProductController
);

router.delete(
  "/delete-color/:id",
  authenticate,
  hasRoles(Role.STAFF),
  ProductController.deleteColorController
);

// tim kiem san pham theo ten
router.get("/search", ProductController.searchProductByNameController);

export default router;
