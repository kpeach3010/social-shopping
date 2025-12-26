import {
  createNotificationService,
  getNotificationsService,
  getUnreadCountService,
  markAsReadService,
  markAllAsReadService,
} from "../services/notification.service.js";

export const getNotificationsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    const list = await getNotificationsService(
      userId,
      Number(limit),
      Number(offset)
    );
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnreadCountController = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await getUnreadCountService(userId);
    res
      .status(200)
      .json({ success: true, data: { count: Number(count) || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsReadController = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await markAsReadService(id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const markAllAsReadController = async (req, res) => {
  try {
    const userId = req.user.id;
    await markAllAsReadService(userId);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
