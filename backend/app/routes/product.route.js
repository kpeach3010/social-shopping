const express = require("express");
const multer = require("multer");
const upload = multer();
const {
  createProductController,
  getAllProductController,
  getProductByIdController,
  deleteProductController,
  deleteVariantController,
  updateProductController,
  deleteColorController,
  searchProductByNameController,
} = require("../controllers/product.controller");
const { authenticate, hasRoles } = require("../middlewares/auth.middleware");
const Role = require("../enums/role.enum");

const router = express.Router();

// Tạo sản phẩm mới (chỉ staff)
router.post(
  "/create-product",
  authenticate,
  hasRoles(Role.STAFF),
  upload.any(),
  createProductController
);

// Lấy tất cả sản phẩm
router.get("/all-products", getAllProductController);

// Lấy sản phẩm theo ID
router.get("/get-product/:id", getProductByIdController);

// Xóa 1 sản phẩm
router.delete(
  "/delete-many/:ids",
  authenticate,
  hasRoles(Role.STAFF),
  deleteProductController
);

// Xóa 1 variant
router.delete(
  "/delete-variant/:id",
  authenticate,
  hasRoles(Role.STAFF),
  deleteVariantController
);

router.put(
  "/update-product/:id",
  authenticate,
  hasRoles(Role.STAFF),
  upload.any(),
  updateProductController
);

router.delete(
  "/delete-color/:id",
  authenticate,
  hasRoles(Role.STAFF),
  deleteColorController
);

// tim kiem san pham theo ten
router.get("/search", searchProductByNameController);

module.exports = router;
