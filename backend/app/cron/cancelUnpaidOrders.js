import { db } from "../db/client.js";
import {
  orders,
  orderItems,
  groupOrders,
  groupOrderMembers,
  conversations,
  products,
  productVariants,
  coupons,
} from "../db/schema.js";
import { notifyAffectedGroups } from "../services/groupOrders.service.js";
import { eq, and, lt, isNull, isNotNull, sql, inArray } from "drizzle-orm";
import { sendOrderStatusNotification } from "../services/orderNotification.service.js";
import { createNotificationService } from "../services/notification.service.js";
import { restoreStockForItems } from "../services/order.service.js";

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
      .returning({ 
        id: orders.id, 
        userId: orders.userId, 
        couponCode: orders.couponCode 
      });

    if (cancelledNormal.length > 0) {
      console.log(
        `[Cron] Đã tự động hủy ${cancelledNormal.length} đơn thường chờ thanh toán quá ${PAYMENT_TIMEOUT_MINUTES} phút:`,
        cancelledNormal.map((o) => o.id),
      );

      // --- 1.1. Hoàn tồn kho cho đơn thường ---
      const normalOrderIds = cancelledNormal.map((o) => o.id);
      const itemsToRestore = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, normalOrderIds));

      if (itemsToRestore.length > 0) {
        const affectedProductIds = await restoreStockForItems(db, itemsToRestore);
        console.log(`[Cron] Đã hoàn kho cho ${itemsToRestore.length} items từ ${cancelledNormal.length} đơn thường.`);

        // Plan V11: Thông báo cho các nhóm khác về việc có hàng về
        for (const pid of affectedProductIds) {
          notifyAffectedGroups(pid, true).catch((err) =>
            console.error(`[Cron] Lỗi thông báo sản phẩm ${pid}:`, err),
          );
        }
      }

      // --- 1.2. Hoàn lại lượt dùng coupon ---
      for (const order of cancelledNormal) {
        if (order.couponCode) {
          await db
            .update(coupons)
            .set({
              used: sql`GREATEST(0, ${coupons.used} - 1)`,
            })
            .where(eq(coupons.code, order.couponCode));
          console.log(`[Cron] Đã hoàn 1 lượt dùng coupon "${order.couponCode}" cho đơn ${order.id}`);
        }

        // --- 1.3. Gửi thông báo ---
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
    // Lưu ý: Không đổi groupOrders.status ở đây.
    // resetTimeoutGroupOrders.js sẽ xóa orders và reset nhóm về "locked"
    // để nhóm có thể tiếp tục đặt đơn.
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
        couponCode: orders.couponCode,
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
          // === 2.1. Hoàn kho cho tất cả đơn trong nhóm ===
          const itemsToRestore = await db
            .select({
              variantId: orderItems.variantId,
              productId: orderItems.productId,
              quantity: orderItems.quantity,
            })
            .from(orderItems)
            .innerJoin(orders, eq(orders.id, orderItems.orderId))
            .where(eq(orders.groupOrderId, groupOrderId));

          for (const item of itemsToRestore) {
            // Hoàn kho variant
            if (item.variantId) {
              await db
                .update(productVariants)
                .set({
                  stock: sql`${productVariants.stock} + ${item.quantity}`,
                })
                .where(eq(productVariants.id, item.variantId));
            }
            // Hoàn kho product tổng
            if (item.productId) {
              await db
                .update(products)
                .set({
                  stock: sql`${products.stock} + ${item.quantity}`,
                })
                .where(eq(products.id, item.productId));
            }
          }

          if (itemsToRestore.length > 0) {
            console.log(
              `[Cron] Đã hoàn kho ${itemsToRestore.length} items cho nhóm ${groupOrderId}`,
            );

            // Plan V11: Thông báo cho các nhóm khác về việc có hàng về
            const affectedProductIds = [...new Set(itemsToRestore.map(i => i.productId).filter(Boolean))];
            for (const pid of affectedProductIds) {
              notifyAffectedGroups(pid, true).catch(err => 
                console.error(`[Cron] Error notifying for product ${pid}:`, err)
              );
            }
          }

          // === 2.2. Giảm coupon.used cho những đơn có dùng coupon ===
          // Gom các couponCode duy nhất trong nhóm (mỗi thành viên dùng cùng 1 coupon)
          const couponCodes = [
            ...new Set(
              groupOrds
                .map((o) => o.couponCode)
                .filter((code) => !!code),
            ),
          ];

          for (const couponCode of couponCodes) {
            // Đếm số đơn trong nhóm dùng coupon này (= số lần cần giảm used)
            const usedCount = groupOrds.filter(
              (o) => o.couponCode === couponCode,
            ).length;

            await db
              .update(coupons)
              .set({
                used: sql`GREATEST(0, ${coupons.used} - ${usedCount})`,
              })
              .where(eq(coupons.code, couponCode));

            console.log(
              `[Cron] Đã hoàn ${usedCount} lượt dùng coupon "${couponCode}" cho nhóm ${groupOrderId}`,
            );
          }

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
            `[Cron] Lỗi xử lý nhóm ${groupOrderId}:`,
            groupErr,
          );
        }
      }
    }
  } catch (err) {
    console.error("[Cron] Lỗi hủy đơn chờ thanh toán:", err);
  }
};
