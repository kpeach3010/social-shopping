import { db } from "../db/client.js";
import { orders } from "../db/schema.js";
import { eq, and, lt } from "drizzle-orm";
import { sendOrderStatusNotification } from "../services/orderNotification.service.js";

/**
 * Tự động hủy đơn hàng ở trạng thái awaiting_payment
 * nếu đã quá 30 phút kể từ khi đặt đơn.
 * Gửi thông báo realtime cho người dùng (kèm ảnh sản phẩm).
 */
export const cancelUnpaidOrders = async (io) => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  try {
    const cancelled = await db
      .update(orders)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.status, "awaiting_payment"),
          lt(orders.createdAt, thirtyMinutesAgo),
        ),
      )
      .returning({ id: orders.id, userId: orders.userId });

    if (cancelled.length > 0) {
      console.log(
        `[Cron] Đã tự động hủy ${cancelled.length} đơn chờ thanh toán quá 30 phút:`,
        cancelled.map((o) => o.id),
      );

      // Gửi thông báo cho từng người dùng
      for (const order of cancelled) {
        await sendOrderStatusNotification({
          orderId: order.id,
          userId: order.userId,
          newStatus: "cancelled",
          customContent: `Đơn hàng #${order.id.slice(0, 8)} đã bị hủy do quá thời hạn thanh toán 30 phút.`,
          io,
        });
      }
    }
  } catch (err) {
    console.error("[Cron] Lỗi hủy đơn chờ thanh toán:", err);
  }
};
