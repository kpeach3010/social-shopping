import { db } from "../db/client.js";
import {
  groupOrders,
  orders,
  orderItems,
  conversations,
} from "../db/schema.js";
import { eq, and, lt } from "drizzle-orm";
import { restoreStockForItems } from "../services/order.service.js";

/**
 * Tự động xóa orders và đưa group order quay về trạng thái "locked"
 * nếu ở trạng thái "awaiting_payment" quá thời hạn.
 * Orders bị xóa hoàn toàn, stock được hoàn lại.
 */
const PAYMENT_TIMEOUT_MINUTES = 30;

export const resetTimeoutGroupOrders = async () => {
  const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

  try {
    // 1. Tìm group orders timeout
    const timeoutGroups = await db
      .select({ id: groupOrders.id })
      .from(groupOrders)
      .where(
        and(
          eq(groupOrders.status, "awaiting_payment"),
          lt(groupOrders.updatedAt, cutoff),
        ),
      );

    if (timeoutGroups.length > 0) {
      console.log(
        `[Cron] Xóa orders và reset ${timeoutGroups.length} group orders do timeout:`,
        timeoutGroups.map((g) => g.id),
      );

      // 2. Lấy tất cả orders cần xóa và hoàn stock
      for (const group of timeoutGroups) {
        // 2.1. Lấy order items để hoàn stock
        const itemsToRestore = await db
          .select({
            variantId: orderItems.variantId,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(
            and(
              eq(orders.groupOrderId, group.id),
              eq(orders.status, "awaiting_payment"),
            ),
          );

        // 2.2. Hoàn stock
        if (itemsToRestore.length > 0) {
          await restoreStockForItems(db, itemsToRestore);
        }

        // 2.3. Xóa orders (cascade sẽ xóa luôn orderItems)
        await db
          .delete(orders)
          .where(
            and(
              eq(orders.groupOrderId, group.id),
              eq(orders.status, "awaiting_payment"),
            ),
          );
      }

      // 3. Đưa group order về trạng thái locked
      const resetResult = await db
        .update(groupOrders)
        .set({
          status: "locked",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(groupOrders.status, "awaiting_payment"),
            lt(groupOrders.updatedAt, cutoff),
          ),
        )
        .returning({ id: groupOrders.id });

      // 4. Emit socket events to notify frontend
      for (const resetGroup of resetResult) {
        try {
          // Get conversationId for socket emission
          const [conv] = await db
            .select({ id: conversations.id })
            .from(conversations)
            .where(eq(conversations.groupOrderId, resetGroup.id))
            .limit(1);

          if (global.io && conv?.id) {
            global.io.to(conv.id).emit("group-status-updated", {
              conversationId: conv.id,
              groupOrderId: resetGroup.id,
              status: "locked",
              reason: "payment_timeout",
            });

            // Send system message about timeout
            try {
              const { createSystemMessage } = await import(
                "../services/message.service.js"
              );
              const content = `Đơn hàng nhóm đã hết thời gian thanh toán (${PAYMENT_TIMEOUT_MINUTES} phút). Vui lòng tạo đơn mới.`;
              const sysMsg = await createSystemMessage(conv.id, content);

              global.io.to(conv.id).emit("message", {
                id: sysMsg.id,
                conversationId: conv.id,
                content,
                type: "system",
                senderId: "00000000-0000-0000-0000-000000000000",
                senderFullName: "Hệ thống",
                createdAt: sysMsg.createdAt,
              });
            } catch (msgErr) {
              console.error("[Cron] Error sending timeout message:", msgErr);
            }
          }
        } catch (socketErr) {
          console.error(
            "[Cron] Error emitting socket for group",
            resetGroup.id,
            ":",
            socketErr,
          );
        }
      }
    }
  } catch (err) {
    console.error("[Cron] Lỗi reset group orders timeout:", err);
  }
};
