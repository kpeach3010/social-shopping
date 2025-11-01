import express from "express";
import * as CategoryController from "../controllers/category.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

const router = express.Router();

router.post(
  "/create-category",
  authenticate,
  hasRoles(Role.STAFF),
  CategoryController.createCategoryController
);

router.put(
  "/update-category/:id",
  authenticate,
  hasRoles(Role.STAFF),
  CategoryController.updateCategoryController
);

router.delete(
  "/delete-category/:id",
  authenticate,
  hasRoles(Role.STAFF),
  CategoryController.deleteCategoryController
);

router.get("/category/:id", CategoryController.getCategoryByIdController);

router.get("/all-categories", CategoryController.getAllCategoriesController);

router.get(
  "/:categoryId/products",
  CategoryController.getProductsByCategoryController
);

export default router;
