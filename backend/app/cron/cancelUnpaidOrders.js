import { db } from "../db/client.js";
import {
  orders,
  groupOrders,
  groupOrderMembers,
  conversations,
  products,
} from "../db/schema.js";
import { eq, and, lt, isNull, isNotNull } from "drizzle-orm";
import { sendOrderStatusNotification } from "../services/orderNotification.service.js";
import { createNotificationService } from "../services/notification.service.js";

/**
 * Tự động hủy đơn hàng ở trạng thái awaiting_payment
 * nếu đã quá 30 phút kể từ khi đặt đơn.
 * Gửi thông báo realtime cho người dùng (kèm ảnh sản phẩm).
 * Đơn nhóm: thông báo riêng cho trưởng nhóm và thành viên.
 */
const PAYMENT_TIMEOUT_MINUTES = 30;

export const cancelUnpaidOrders = async (io) => {
  const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

  try {
    // === 1. Hủy đơn THƯỜNG (không thuộc nhóm) ===
    const cancelledNormal = await db
      .update(orders)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.status, "awaiting_payment"),
          lt(orders.createdAt, cutoff),
          isNull(orders.groupOrderId),
        ),
      )
      .returning({ id: orders.id, userId: orders.userId });

    if (cancelledNormal.length > 0) {
      console.log(
        `[Cron] Đã tự động hủy ${cancelledNormal.length} đơn thường chờ thanh toán quá ${PAYMENT_TIMEOUT_MINUTES} phút:`,
        cancelledNormal.map((o) => o.id),
      );

      for (const order of cancelledNormal) {
        await sendOrderStatusNotification({
          orderId: order.id,
          userId: order.userId,
          newStatus: "cancelled",
          customContent: `Đơn hàng #${order.id.slice(0, 8)} đã bị hủy do quá thời hạn thanh toán ${PAYMENT_TIMEOUT_MINUTES} phút.`,
          io,
        });
      }
    }

    // === 2. Hủy đơn NHÓM (thuộc group order) ===
    const cancelledGroup = await db
      .update(orders)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.status, "awaiting_payment"),
          lt(orders.createdAt, cutoff),
          isNotNull(orders.groupOrderId),
        ),
      )
      .returning({
        id: orders.id,
        userId: orders.userId,
        groupOrderId: orders.groupOrderId,
      });

    if (cancelledGroup.length > 0) {
      console.log(
        `[Cron] Đã tự động hủy ${cancelledGroup.length} đơn nhóm chờ thanh toán quá ${PAYMENT_TIMEOUT_MINUTES} phút:`,
        cancelledGroup.map((o) => o.id),
      );

      // Gom theo groupOrderId để xử lý từng nhóm
      const groupMap = new Map();
      for (const order of cancelledGroup) {
        if (!groupMap.has(order.groupOrderId)) {
          groupMap.set(order.groupOrderId, []);
        }
        groupMap.get(order.groupOrderId).push(order);
      }

      for (const [groupOrderId, groupOrds] of groupMap) {
        try {
          // Lấy thông tin nhóm: creatorId + productId
          const [group] = await db
            .select({
              creatorId: groupOrders.creatorId,
              productId: groupOrders.productId,
            })
            .from(groupOrders)
            .where(eq(groupOrders.id, groupOrderId))
            .limit(1);

          // Lấy ảnh thumbnail sản phẩm mua chung
          let productImageUrl = null;
          if (group?.productId) {
            const [product] = await db
              .select({ thumbnailUrl: products.thumbnailUrl })
              .from(products)
              .where(eq(products.id, group.productId))
              .limit(1);
            productImageUrl = product?.thumbnailUrl || null;
          }

          // Lấy tên nhóm từ conversation
          const [conv] = await db
            .select({ name: conversations.name })
            .from(conversations)
            .where(eq(conversations.groupOrderId, groupOrderId))
            .limit(1);

          const groupName = conv?.name || "nhóm mua chung";
          const creatorId = group?.creatorId;

          // Lấy tất cả thành viên trong nhóm
          const members = await db
            .select({ userId: groupOrderMembers.userId })
            .from(groupOrderMembers)
            .where(eq(groupOrderMembers.groupOrderId, groupOrderId));

          const socketIo = io || global.io;

          // Gửi thông báo cho từng thành viên
          for (const member of members) {
            const isCreator =
              creatorId && String(member.userId) === String(creatorId);

            const content = isCreator
              ? `Nhóm "${groupName}": Đơn hàng nhóm đã bị hủy do bạn chưa thanh toán trong ${PAYMENT_TIMEOUT_MINUTES} phút. Vui lòng đặt đơn lại.`
              : `Nhóm "${groupName}": Đơn hàng nhóm đã bị hủy do trưởng nhóm thanh toán trễ. Vui lòng chờ trưởng nhóm đặt đơn lại.`;

            // Tìm orderId của thành viên này (nếu có) để link thông báo
            const memberOrder = groupOrds.find(
              (o) => String(o.userId) === String(member.userId),
            );

            const created = await createNotificationService({
              userId: member.userId,
              type: "order_cancelled",
              title: "Đơn hàng nhóm đã bị hủy",
              content,
              relatedEntityType: "order",
              relatedEntityId: memberOrder?.id || groupOrds[0].id,
              actionUrl: `/profile?tab=orders&status=cancelled`,
              imageUrl: productImageUrl,
            });

            if (socketIo) {
              socketIo
                .to(String(member.userId))
                .emit("notification:new", { notification: created });
            }
          }
        } catch (groupErr) {
          console.error(
            `[Cron] Lỗi gửi thông báo nhóm ${groupOrderId}:`,
            groupErr,
          );
        }
      }
    }
  } catch (err) {
    console.error("[Cron] Lỗi hủy đơn chờ thanh toán:", err);
  }
};
