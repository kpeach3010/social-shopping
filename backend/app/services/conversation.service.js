import { db } from "../db/client.js";
import {
  conversations,
  conversationMembers,
  users,
  messages,
} from "../db/schema.js";

import { eq, and, or } from "drizzle-orm";
import { exists } from "drizzle-orm";

export const getOrCreateDirectConversationService = async (
  userId,
  partnerId
) => {
  // 1. Kiểm tra xem đã có conversation direct giữa 2 user chưa
  const directConversation = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.type, "direct"),
        exists(
          db
            .select()
            .from(conversationMembers)
            .where(
              and(
                eq(conversationMembers.conversationId, conversations.id),
                eq(conversationMembers.userId, userId)
              )
            )
        ),
        exists(
          db
            .select()
            .from(conversationMembers)
            .where(
              and(
                eq(conversationMembers.conversationId, conversations.id),
                eq(conversationMembers.userId, partnerId)
              )
            )
        )
      )
    );

  if (directConversation.length > 0) {
    // Đã có conversation direct giữa 2 user
    const [partner] = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, partnerId));
    return {
      id: directConversation[0].id,
      partner,
    };
  }

  // 2. Nếu chưa có → tạo mới conversation
  const [partner] = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, partnerId));

  const [conversation] = await db
    .insert(conversations)
    .values({
      type: "direct",
      name: "Direct Chat",
    })
    .returning();

  // 3. Thêm 2 user vào conversation_members
  await db.insert(conversationMembers).values([
    { conversationId: conversation.id, userId },
    { conversationId: conversation.id, userId: partnerId },
  ]);

  return {
    id: conversation.id,
    partner,
  };
};

export const getMessagesService = async (conversationId) => {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
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
