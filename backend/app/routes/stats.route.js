import express from "express";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";
import { getStaffDashboardStatsController } from "../controllers/stats.controller.js";

const router = express.Router();

// Thống kê tổng quan cho staff
router.get(
  "/staff/dashboard",
  authenticate,
  hasRoles(Role.STAFF),
  getStaffDashboardStatsController,
);

export default router;
