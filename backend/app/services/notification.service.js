import { db } from "../db/client.js";
import { notifications } from "../db/schema.js";
import { eq, and, sql, desc, ne } from "drizzle-orm";

// Tạo thông báo mới
export const createNotificationService = async (data) => {
  const [notification] = await db
    .insert(notifications)
    .values({ ...data, isRead: false })
    .returning();
  return notification;
};

// Lấy danh sách thông báo (trừ friend_request)
export const getNotificationsService = async (
  userId,
  limit = 20,
  offset = 0
) => {
  const list = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
  return list.filter((n) => n.type !== "friend_request");
};

// Đánh dấu 1 thông báo đã đọc
export const markAsReadService = async (notificationId) => {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId))
    .returning();
  return updated;
};

// Đếm số thông báo chưa đọc
export const getUnreadCountService = async (userId) => {
  const result = await db
    .select({ count: sql`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        ne(notifications.type, "friend_request")
      )
    );
  return result[0]?.count || 0;
};

// Đánh dấu tất cả thông báo đã đọc
export const markAllAsReadService = async (userId) => {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return { success: true };
};
