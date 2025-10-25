import { db } from "../db/client.js";
import { users, messages, messageReads } from "../db/schema.js";

import { eq, asc } from "drizzle-orm";

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

  return msg;
};

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
