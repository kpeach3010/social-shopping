const express = require("express");
const {
  createCategoryController,
  getAllCategoriesController,
  updateCategoryController,
  deleteCategoryController,
  getCategoryByIdController,
} = require("../controllers/category.controller");
const { authenticate, hasRoles } = require("../middlewares/auth.middleware");
const Role = require("../enums/role.enum");

const router = express.Router();

router.post(
  "/create-category",
  authenticate,
  hasRoles(Role.STAFF),
  createCategoryController
);

router.put(
  "/update-category/:id",
  authenticate,
  hasRoles(Role.STAFF),
  updateCategoryController
);

router.delete(
  "/delete-category/:id",
  authenticate,
  hasRoles(Role.STAFF),
  deleteCategoryController
);

router.get(
  "/category/:id",
  authenticate,
  hasRoles(Role.STAFF),
  getCategoryByIdController
);

router.get("/all-categories", getAllCategoriesController);

module.exports = router;
