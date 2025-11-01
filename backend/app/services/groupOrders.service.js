import { type } from "os";
import { db } from "../db/client.js";
import {
  conversations,
  users,
  groupOrders,
  coupons,
  products,
  groupOrderMembers,
  inviteLinks,
} from "../db/schema.js";
import { eq } from "drizzle-orm";

// lay thong tin group order theo conversationId
export const getGroupOrderDetailService = async (userId, conversationId) => {
  // lay conversation
  const [conv] = await db
    .select({
      id: conversations.id,
      groupOrderId: conversations.groupOrderId,
      name: conversations.name,
      type: conversations.type,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv || !conv.groupOrderId) {
    throw new Error("Conversation or Group Order not found");
  }

  // lay invite link cua group order
  const [invite] = await db
    .select({
      token: inviteLinks.token,
      expiresAt: inviteLinks.expiresAt,
    })
    .from(inviteLinks)
    .where(eq(inviteLinks.conversationId, conversationId))
    .limit(1);

  const token = invite ? invite.token : null;
  // lay thong tin group order
  const [groupOrder] = await db
    .select({
      id: groupOrders.id,
      status: groupOrders.status,
      targetMember: groupOrders.targetMember,
      currentMember: groupOrders.currentMember,
      productId: groupOrders.productId,
      couponId: groupOrders.couponId,
      createdAt: groupOrders.createdAt,
      expiresAt: groupOrders.expiresAt,
      creatorId: groupOrders.creatorId,
    })
    .from(groupOrders)
    .where(eq(groupOrders.id, conv.groupOrderId));

  if (!groupOrder) {
    throw new Error("Group Order not found");
  }

  // console.log("conv:", conv);
  // console.log("groupOrderId:", conv.groupOrderId);

  // Lay san pham va coupon
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      thumbnailUrrl: products.thumbnailUrl,
      price_default: products.price_default,
      stock: products.stock,
    })
    .from(products)
    .where(eq(products.id, groupOrder.productId));

  const [coupon] = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      type: coupons.type,
      value: coupons.value,
      endsAt: coupons.endsAt,
      minTotalQuantity: coupons.minTotalQuantity,
      maxMember: coupons.maxMember,
    })
    .from(coupons)
    .where(eq(coupons.id, groupOrder.couponId));

  // Lay danh sach thanh vien trong group order
  const members = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(groupOrderMembers)
    .innerJoin(users, eq(groupOrderMembers.userId, users.id))
    .where(eq(groupOrderMembers.groupOrderId, groupOrder.id));

  // Kiem tra nguoiw dung hien tai co trong nhom khong
  const isMember = members.some((member) => member.id === userId);

  return {
    conversation: { id: conversationId, name: conv.name, type: conv.type },
    groupOrder,
    product,
    coupon,
    members,
    isMember,
    inviteToken: token,
  };
};
