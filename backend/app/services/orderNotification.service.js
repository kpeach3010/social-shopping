import { db } from "../db/client.js";
import { orderItems } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createNotificationService } from "../services/notification.service.js";

/**
 * Cấu hình thông báo cho từng trạng thái đơn hàng
 */
const STATUS_NOTIFICATION_MAP = {
  pending: {
    type: "order_paid",
    title: "Đơn hàng đã được thanh toán",
    content: (id) =>
      `Đơn hàng #${id.slice(0, 8)} đã thanh toán thành công. Chờ shop xác nhận.`,
    statusTab: "pending",
  },
  confirmed: {
    type: "order_confirmed",
    title: "Đơn hàng đã được xác nhận",
    content: (id) =>
      `Đơn hàng #${id.slice(0, 8)} đã được shop xác nhận và đang chuẩn bị giao.`,
    statusTab: "confirmed",
  },
  rejected: {
    type: "order_rejected",
    title: "Đơn hàng bị từ chối",
    content: (id) =>
      `Đơn hàng #${id.slice(0, 8)} đã bị shop từ chối. Vui lòng liên hệ shop để biết thêm chi tiết.`,
    statusTab: "rejected",
  },
  completed: {
    type: "order_completed",
    title: "Đơn hàng hoàn thành",
    content: (id) =>
      `Đơn hàng #${id.slice(0, 8)} đã giao thành công. Cảm ơn bạn đã mua hàng!`,
    statusTab: "completed",
  },
  cancelled: {
    type: "order_cancelled",
    title: "Đơn hàng đã bị hủy",
    content: (id) => `Đơn hàng #${id.slice(0, 8)} đã bị hủy.`,
    statusTab: "cancelled",
  },
};

/**
 * Gửi thông báo khi đơn hàng thay đổi trạng thái
 * @param {Object} params
 * @param {string} params.orderId - ID đơn hàng
 * @param {string} params.userId - ID người nhận thông báo
 * @param {string} params.newStatus - Trạng thái mới (pending, confirmed, rejected, completed, cancelled)
 * @param {string} [params.customContent] - Nội dung tùy chỉnh (ghi đè mặc định)
 * @param {Object} [params.io] - Socket.io instance (nếu không truyền sẽ dùng global.io)
 */
export const sendOrderStatusNotification = async ({
  orderId,
  userId,
  newStatus,
  customContent,
  io,
}) => {
  const config = STATUS_NOTIFICATION_MAP[newStatus];
  if (!config) return; // Trạng thái không cần thông báo

  try {
    // Lấy ảnh sản phẩm đầu tiên trong đơn
    const [firstItem] = await db
      .select({ imageUrl: orderItems.imageUrl })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .limit(1);

    const notification = await createNotificationService({
      userId,
      type: config.type,
      title: config.title,
      content: customContent || config.content(orderId),
      relatedEntityType: "order",
      relatedEntityId: orderId,
      actionUrl: `/profile?tab=orders&status=${config.statusTab}`,
      imageUrl: firstItem?.imageUrl || null,
    });

    // Gửi realtime qua socket
    const socketIo = io || global.io;
    if (socketIo) {
      socketIo.to(String(userId)).emit("notification:new", { notification });
    }

    return notification;
  } catch (err) {
    console.error(
      `[Notification] Lỗi gửi thông báo đơn ${orderId} → ${newStatus}:`,
      err,
    );
  }
};
