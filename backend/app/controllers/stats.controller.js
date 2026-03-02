import { getStaffDashboardStatsService } from "../services/stats.service.js";

export const getStaffDashboardStatsController = async (req, res) => {
  try {
    const { range = "30d" } = req.query;
    const stats = await getStaffDashboardStatsService(range);
    res.json(stats);
  } catch (err) {
    console.error("Error fetching staff dashboard stats:", err);
    res.status(500).json({ error: "Không thể tải thống kê" });
  }
};
