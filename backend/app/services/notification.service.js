import { db } from "../db/client.js";
import { notifications } from "../db/schema.js";
import { sql, and, eq, ne } from "drizzle-orm";

export const createNotificationService = async (data) => {
  const [notification] = await db
    .insert(notifications)
    .values({ ...data, isRead: false })
    .returning();
  return notification;
};

export const getNotificationsService = async (
  userId,
  limit = 20,
  offset = 0
) => {
  const userNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(notifications.createdAt)
    .limit(limit)
    .offset(offset);

  return userNotifications.filter((n) => n.type !== "friend_request");
};

export const markAsReadService = async (notificationId) => {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId))
    .returning();
  return updated;
};

export const getUnreadCountService = async (userId) => {
  const result = await db
    .select({ count: sql`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        ne(notifications.isRead, true),
        ne(notifications.type, "friend_request")
      )
    );
  return result[0]?.count || 0;
};

export const markAllAsReadService = async (userId) => {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), ne(notifications.isRead, true))
    );
  return { success: true };
};
