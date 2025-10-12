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

import { eq, and, or, isNull, gt, count } from "drizzle-orm";
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

  // 1. Kiem tra coupon hop le va ap dung cho san pham
  const coupons = await getAvailableCouponsForProductsService({
    productIds: [productId],
    userId: creatorId,
    onlyApplicable: true,
  });

  const coupon = coupons.find((c) => c.id === couponId);
  if (!coupon) {
    throw new Error("Coupon không hợp lệ hoặc không áp dụng cho sản phẩm này");
  }

  if (coupon.kind !== "group") {
    throw new Error("Coupon này không phải loại group, không thể tạo link mời");
  }

  // 2. Kiem tra creator da co link hop le ( chua dung & chua het han) chua
  const [existing] = await db
    .select()
    .from(inviteLinks)
    .where(
      and(
        eq(inviteLinks.creatorId, creatorId),
        eq(inviteLinks.productId, productId),
        eq(inviteLinks.couponId, couponId),
        eq(inviteLinks.isUsed, false),
        or(isNull(inviteLinks.expiresAt), gt(inviteLinks.expiresAt, now))
      )
    )
    .limit(1);

  // 3. Neu co roi thi tai su dung
  if (existing) {
    return {
      reused: true,
      inviteLink: `${frontendId}/invite/$${existing.token}`,
      expiresAt: existing.expiresAt,
    };
  }

  // 4. Neu chua co thi tao moi
  const token = randomUUID();
  const couponExpire = new Date(coupon.endsAt); // ngay het han coupon
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
    .returning();
  return {
    reused: false,
    inviteLink: `${frontendId}/invite/${newLink.token}`,
    expiresAt: newLink.expiresAt,
  };
};

// join group order qua link
export const joinGroupOrderByInviteLinkService = async ({ token, userId }) => {
  // 1. Kiem tra link co ton tai va hop le khong
  const [link] = await db
    .select()
    .from(inviteLinks)
    .where(eq(inviteLinks.token, token))
    .limit(1);

  if (!link) {
    throw new Error("Link không hợp lệ");
  }

  if (link.isUsed) {
    throw new Error("Link đã được sử dụng");
  }

  const now = new Date();
  if (link.expiresAt && link.expiresAt < now) {
    throw new Error("Link đã hết hạn");
  }

  // 2. Kiem tra userId có phải là thành viên của group không
  const isMember = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, link.conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  if (!isMember) {
    throw new Error("Bạn không phải là thành viên của group này");
  }

  // 3. Tham gia group
  await db.insert(conversationMembers).values({
    conversationId: link.conversationId,
    userId,
  });

  // 4. Đánh dấu link là đã sử dụng
  await db
    .update(inviteLinks)
    .set({ isUsed: true })
    .where(eq(inviteLinks.id, link.id));

  return {
    conversationId: link.conversationId,
    userId,
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
