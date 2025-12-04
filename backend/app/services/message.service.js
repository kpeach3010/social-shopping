import { db } from "../db/client.js";
import {
  users,
  messages,
  messageReads,
  conversations,
  conversationMembers,
} from "../db/schema.js";

import { eq, asc, and, or, inArray, ne, isNull, gt, count } from "drizzle-orm";

export const getMessagesService = async (conversationId) => {
  return await db
    .select({
      id: messages.id,
      content: messages.content,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
      senderFullName: users.fullName,
      // senderAvatar: users.avatar,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
};

export const sendMessageService = async (conversationId, senderId, content) => {
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId,
      content,
      type: "text",
    })
    .returning();

  await db
    .update(conversations)
    .set({
      lastMessage: content,
      lastMessageAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));

  const [user] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, senderId));
  return { ...msg, senderFullName: user.fullName };
};

// Danh dau cuoc tro chuyen la da doc
export const markConversationAsReadService = async (conversationId, userId) => {
  const now = new Date();

  // 1. Kiem tra da co record chua
  const existingRecord = await db
    .select()
    .from(messageReads)
    .where(
      eq(messageReads.conversationId, conversationId),
      eq(messageReads.userId, userId)
    )
    .limit(1);

  // 2. neu co roi thi update
  if (existingRecord.length > 0) {
    await db
      .update(messageReads)
      .set({
        lastReadAt: now,
        updatedAt: now,
      })
      .where(
        eq(messageReads.conversationId, conversationId),
        eq(messageReads.userId, userId)
      );
  } else {
    // 2. neu chua co thi insert
    await db.insert(messageReads).values({
      conversationId,
      userId,
      lastReadAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { success: true, lastReadAt: now };
};

export const getUnreadMessageCountService = async (userId) => {
  // 1. lay danh sach conversation ma user tham gia
  const memberRows = await db
    .select({ conversationId: conversationMembers.conversationId })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  const conversationIds = memberRows.map((r) => r.conversationId);
  if (conversationIds.length === 0) return 0;

  // 2. count unread messages efficiently at DB level
  const [{ count: unreadCount }] = await db
    .select({ count: count().mapWith(Number) })
    .from(messages)
    .leftJoin(
      messageReads,
      and(
        eq(messages.conversationId, messageReads.conversationId),
        eq(messageReads.userId, userId)
      )
    )
    .where(
      and(
        inArray(messages.conversationId, conversationIds),
        ne(messages.senderId, userId), // không tính tin nhắn của chính user
        or(
          isNull(messageReads.lastReadAt),
          gt(messages.createdAt, messageReads.lastReadAt)
        )
      )
    );

  return unreadCount || 0;
};

export async function createSystemMessage(conversationId, content) {
  const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      content,
      type: "system",
      senderId: SYSTEM_USER_ID,
    })
    .returning();

  return {
    ...msg,
    type: "system",
  };
}
