import { db } from "../db/client.js";
import {
  conversations,
  conversationMembers,
  users,
  messages,
  groupOrders,
  groupOrderMembers,
  inviteLinks,
  coupons,
} from "../db/schema.js";
import {
  getAvailableCouponsForProductsService,
  getValidCouponsService,
} from "./coupon.service.js";

import { eq, and, or, isNull, gt, count, inArray, ne, asc } from "drizzle-orm";
import { exists } from "drizzle-orm";
import { randomUUID } from "crypto";
import e from "express";

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
      isNew: false,
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
    isNew: true,
  };
};

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

// lay group order cua user
export const getUserGroupConversationsService = async (userId) => {
  const result = await db
    .select({
      id: conversations.id,
      name: conversations.name,
      type: conversations.type,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(
      conversationMembers,
      eq(conversations.id, conversationMembers.conversationId)
    )
    .where(
      and(
        eq(conversations.type, "group"),
        eq(conversationMembers.userId, userId)
      )
    );

  return result;
};

// Tạo link mời vào nhóm mua chung
const LINK_EXPIRATION_HOURS = 24; // link hết hạn sau 24h

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export const createInviteLinkService = async ({
  creatorId,
  productId,
  couponId,
  frontendId,
}) => {
  const now = new Date();

  // 1. Kiểm tra coupon hợp lệ
  const coupons = await getAvailableCouponsForProductsService({
    productIds: [productId],
    userId: creatorId,
    onlyApplicable: true,
  });

  const coupon = coupons.find((c) => c.id === couponId);
  if (!coupon)
    throw new Error("Coupon không hợp lệ hoặc không áp dụng cho sản phẩm này");

  if (coupon.kind !== "group")
    throw new Error("Coupon này không phải loại group, không thể tạo link mời");

  // 2. Kiểm tra link hiện có
  const [existing] = await db
    .select({
      token: inviteLinks.token,
      expiresAt: inviteLinks.expiresAt,
      conversationName: conversations.name,
      isUsed: inviteLinks.isUsed,
    })
    .from(inviteLinks)
    .leftJoin(conversations, eq(inviteLinks.conversationId, conversations.id))
    .where(
      and(
        eq(inviteLinks.creatorId, creatorId),
        eq(inviteLinks.productId, productId),
        eq(inviteLinks.couponId, couponId),
        or(isNull(inviteLinks.expiresAt), gt(inviteLinks.expiresAt, now))
      )
    )
    .limit(1);

  // 3.Nếu có link hợp lệ
  if (existing) {
    return {
      reused: true,
      inviteLink: `${frontendId}/invite/${existing.token}`,
      expiresAt: existing.expiresAt,
      conversationName: existing.conversationName,
      isUsed: existing.isUsed,
    };
  }

  // 4. Nếu chưa có -> tạo mới
  const token = randomUUID();
  const couponExpire = new Date(coupon.endsAt);
  const linkExpire = addHours(now, LINK_EXPIRATION_HOURS);
  const expiresAt = couponExpire < linkExpire ? couponExpire : linkExpire;

  const [newLink] = await db
    .insert(inviteLinks)
    .values({
      token,
      creatorId,
      productId,
      couponId,
      isUsed: false,
      expiresAt,
    })
    .onConflictDoNothing()
    .returning();

  // Nếu insert bị bỏ qua (do trùng) -> lấy lại link cũ
  if (!newLink) {
    const [fetched] = await db
      .select()
      .from(inviteLinks)
      .where(
        and(
          eq(inviteLinks.creatorId, creatorId),
          eq(inviteLinks.productId, productId),
          eq(inviteLinks.couponId, couponId)
        )
      )
      .limit(1);
    return {
      reused: true,
      inviteLink: `${frontendId}/invite/${fetched.token}`,
      expiresAt: fetched.expiresAt,
    };
  }

  return {
    reused: false,
    inviteLink: `${frontendId}/invite/${newLink.token}`,
    expiresAt: newLink.expiresAt,
  };
};

export const joinGroupOrderByInviteTokenService = async ({ token, userId }) => {
  const now = new Date();

  // Tìm link mời
  const [link] = await db
    .select()
    .from(inviteLinks)
    .where(eq(inviteLinks.token, token))
    .limit(1);

  if (!link) throw new Error("Link mời không tồn tại");
  if (link.expiresAt && link.expiresAt < now)
    throw new Error("Link mời đã hết hạn");

  // Nếu chưa kích hoạt thì đánh dấu là đã dùng
  if (!link.isUsed) {
    await db
      .update(inviteLinks)
      .set({ isUsed: true })
      .where(eq(inviteLinks.id, link.id));
  }

  //  Nếu chưa có conversation -> tạo mới
  let conversationId = link.conversationId;
  let conversationName = null;
  let groupOrderId = null;
  let coupon = null;

  if (!conversationId) {
    const shortId = Math.random().toString(36).slice(2, 6);

    // Lấy thông tin coupon
    [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, link.couponId))
      .limit(1);

    if (!coupon) throw new Error("Coupon không tồn tại hoặc đã bị xóa");

    // Tạo conversation group
    const [conversation] = await db
      .insert(conversations)
      .values({
        ownerId: link.creatorId,
        type: "group",
        name: `${coupon.code}-${shortId}`,
        inviteToken: link.token,
      })
      .returning();

    conversationId = conversation.id;
    conversationName = conversation.name;

    // Cập nhật conversationId cho invite link
    await db
      .update(inviteLinks)
      .set({ conversationId })
      .where(eq(inviteLinks.id, link.id));

    // Tạo group order
    const [groupOrder] = await db
      .insert(groupOrders)
      .values({
        productId: link.productId,
        creatorId: link.creatorId,
        targetMember: coupon.maxMember ?? 3,
        currentMember: 1,
        couponId: coupon.id,
        status: "pending",
      })
      .returning();

    groupOrderId = groupOrder.id;

    // Cập nhật groupOrderId cho conversation
    await db
      .update(conversations)
      .set({ groupOrderId })
      .where(eq(conversations.id, conversationId));

    // Thêm creator vào members
    await db.insert(conversationMembers).values({
      conversationId,
      userId: link.creatorId,
    });

    await db.insert(groupOrderMembers).values({
      groupOrderId,
      userId: link.creatorId,
      hasChosen: false,
    });
  }

  // Kiểm tra user đã là thành viên chưa
  const [existingMember] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  if (existingMember) {
    return { message: "Bạn đã là thành viên của group này" };
  }

  if (!groupOrderId) {
    const [conv] = await db
      .select({
        id: conversations.id,
        name: conversations.name,
        groupOrderId: conversations.groupOrderId,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    groupOrderId = conv.groupOrderId;
    conversationName = conv.name;

    [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, link.couponId))
      .limit(1);
  }

  //  Thêm user vào nhóm
  await db.insert(conversationMembers).values({
    conversationId,
    userId,
  });

  await db.insert(groupOrderMembers).values({
    groupOrderId,
    userId,
    hasChosen: false,
  });

  //  Cập nhật số lượng thành viên
  const [{ count: totalMembers }] = await db
    .select({ count: count().mapWith(Number) })
    .from(groupOrderMembers)
    .where(eq(groupOrderMembers.groupOrderId, groupOrderId));

  await db
    .update(groupOrders)
    .set({ currentMember: totalMembers })
    .where(eq(groupOrders.id, groupOrderId));

  const [groupOrder] = await db
    .select()
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId));

  if (groupOrder.targetMember && totalMembers >= groupOrder.targetMember) {
    await db
      .update(groupOrders)
      .set({ status: "locked" })
      .where(eq(groupOrders.id, groupOrderId));
  }

  //  Trả kết quả cuối cùng
  return {
    message: "Tham gia nhóm thành công",
    conversationId,
    groupOrderId,
    conversationName,
    couponCode: coupon?.code ?? null,
  };
};

// lay tat ca coversation user tham gia
export const getUserConversationsService = async (userId) => {
  // 1. lay tat ca conversation ma user la thanh vien
  const userMemberships = await db
    .select({ conversationId: conversationMembers.conversationId })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  if (userMemberships.length === 0) return [];

  const conversationIds = userMemberships.map(
    (membership) => membership.conversationId
  );

  // 2. lay thong tin conversation tuong ung
  const userConversations = await db
    .select({
      id: conversations.id,
      type: conversations.type,
      name: conversations.name,
      ownerId: conversations.ownerId,
    })
    .from(conversations)
    .where(inArray(conversations.id, conversationIds));
  // 3. neu la conversation direct thi lay ten partner
  for (const conv of userConversations) {
    if (conv.type === "direct") {
      const partner = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(conversationMembers)
        .innerJoin(users, eq(conversationMembers.userId, users.id))
        .where(
          and(
            eq(conversationMembers.conversationId, conv.id),
            ne(conversationMembers.userId, userId)
          )
        )
        .limit(1);

      conv.name = partner[0]?.fullName || "Người dùng";
    }
  }

  return userConversations;
};

export const getConversationByIdService = async (conversationId, userId) => {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) return null;

  if (conv.type === "direct") {
    const members = await db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));

    const partner = members.find((m) => m.userId !== userId);
    if (partner) {
      const [partnerInfo] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, partner.userId));
      conv.partner = partnerInfo || null;
    }
  } else if (conv.type === "group") {
    // Lấy danh sách thành viên
    const members = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(conversationMembers)
      .innerJoin(users, eq(users.id, conversationMembers.userId))
      .where(eq(conversationMembers.conversationId, conversationId));

    conv.members = members.map((m) => m.users || m);
    if (!conv.name) conv.name = `Nhóm ${members.length} thành viên`;
  }

  return conv;
};
