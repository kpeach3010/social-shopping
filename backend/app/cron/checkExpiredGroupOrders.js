import { db } from "../db/client.js";
import { groupOrders, coupons, conversations, messages } from "../db/schema.js";
import { eq, and, ne } from "drizzle-orm";

export const checkExpiredGroupOrders = async (io) => {
  const now = new Date();

  // Lấy các group chưa hoàn tất/hủy
  const groups = await db
    .select({
      id: groupOrders.id,
      couponId: groupOrders.couponId,
      status: groupOrders.status,
      conversationId: conversations.id,
    })
    .from(groupOrders)
    .innerJoin(conversations, eq(conversations.groupOrderId, groupOrders.id))
    .where(
      and(
        ne(groupOrders.status, "completed"),
        ne(groupOrders.status, "ordering"),
        ne(groupOrders.status, "cancelled")
      )
    );

  for (const g of groups) {
    const coupon = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, g.couponId))
      .limit(1);

    if (!coupon.length) continue;

    const endsAt = new Date(coupon[0].endsAt);

    // Coupon hết hạn -> hủy nhóm
    if (endsAt <= now) {
      // 1. Cập nhật trạng thái TRƯỚC để tránh Race Condition (Cron chạy lần sau sẽ bỏ qua ngay)
      const [updatedGroup] = await db
        .update(groupOrders)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(groupOrders.id, g.id),
            ne(groupOrders.status, "cancelled") // Check lại lần nữa cho chắc
          )
        )
        .returning();

      // Nếu không update được (nghĩa là đã bị hủy bởi luồng khác rồi) thì dừng
      if (!updatedGroup) continue;

      const reason = "Nhóm mua chung đã bị hủy do mã giảm giá đã hết hạn.";

      // 1.Tạo system message vào DB (tự làm trong cron)
      const sysMsgInsert = await db
        .insert(messages)
        .values({
          conversationId: g.conversationId,
          content: reason,
          type: "system",
          senderId: "00000000-0000-0000-0000-000000000000",
          createdAt: new Date(),
        })
        .returning();

      const sysMsg = sysMsgInsert[0];

      // 3. Emit tin nhắn system vào khung chat
      io.to(g.conversationId).emit("message", {
        id: sysMsg.id,
        conversationId: g.conversationId,
        content: reason,
        type: "system",
        senderId: sysMsg.senderId,
        createdAt: sysMsg.createdAt,
      });

      // 4. Emit event group-order-cancelled cho FE
      io.to(g.conversationId).emit("group-order-cancelled", {
        conversationId: g.conversationId,
        reason,
        message: sysMsg, // FE có thể push vào UI
      });

      console.log(`Cron: Cancelled group ${g.id} vì coupon hết hạn.`);
    }
  }
};
