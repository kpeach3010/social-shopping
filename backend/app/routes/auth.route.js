import express from "express";
import * as AuthController from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", AuthController.registerController);
router.post("/login", AuthController.loginController);
router.post(
  "/refresh-token",
  (req, res, next) => {
    console.log("Bỏ qua middleware authenticate cho /refresh-token");
    next();
  },
  AuthController.refreshTokenController
);

export default router;
