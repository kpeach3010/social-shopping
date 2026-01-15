import express from "express";
import multer from "multer";
import { runTryOnController } from "../controllers/tryOn.controller.js";

const router = express.Router();

// upload ảnh user (không lưu disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post("/run", upload.single("person"), runTryOnController);

export default router;
