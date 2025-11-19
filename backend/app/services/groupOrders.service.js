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
  productVariants,
  conversationMembers,
} from "../db/schema.js";
import { checkoutService } from "./order.service.js";
import { eq, and, asc } from "drizzle-orm";

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
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      hasChosen: groupOrderMembers.hasChosen,
      variantId: groupOrderMembers.variantId,
      quantity: groupOrderMembers.quantity,
    })
    .from(groupOrderMembers)
    .innerJoin(users, eq(groupOrderMembers.userId, users.id))
    .where(eq(groupOrderMembers.groupOrderId, groupOrder.id));

  const normalizedMembers = members.map((m) => ({
    ...m,
    hasChosen: !!m.hasChosen,
    quantity: m.quantity ?? 0,
  }));

  // Kiểm tra người hiện tại có trong nhóm không
  const isMember = normalizedMembers.some((m) => m.userId === userId);

  return {
    conversation: { id: conversationId, name: conv.name, type: conv.type },
    groupOrder,
    product,
    coupon,
    members: normalizedMembers,
    isMember,
    inviteToken: token,
  };
};

export const chooseVariantService = async ({
  groupOrderId,
  userId,
  variantId,
  quantity,
}) => {
  if (!variantId) throw new Error("Variant ID is required");
  if (!quantity || quantity <= 0)
    throw new Error("Quantity must be greater than zero");

  // Lay thong tin nhom
  const [groupOrder] = await db
    .select()
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId));

  if (!groupOrder) throw new Error("Group Order not found");
  // Kiem tra trang thai group co locked chua
  if (groupOrder.status !== "locked")
    throw new Error("Group Order is not locked");

  // Kiem tra variant co ton tai khong
  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) throw new Error("Variant not found");
  // Kiem tra so luong trong kho
  if (variant.stock < quantity)
    throw new Error("Insufficient stock for the selected variant");

  // Kiểm tra user có trong nhóm không
  const [member] = await db
    .select()
    .from(groupOrderMembers)
    .where(
      and(
        eq(groupOrderMembers.groupOrderId, groupOrderId),
        eq(groupOrderMembers.userId, userId)
      )
    )
    .limit(1);

  if (!member) throw new Error("Bạn chưa tham gia nhóm này");

  const isUpdate = member.hasChosen === true;

  //  Cap nhat lua chon
  await db
    .update(groupOrderMembers)
    .set({
      variantId,
      quantity,
      hasChosen: true,
      updatedAt: new Date(),
    })
    .where(eq(groupOrderMembers.id, member.id));

  return {
    message: "Chọn sản phẩm thành công",
    data: {
      groupOrderId,
      userId,
      variantId,
      quantity,
      isUpdate,
    },
  };
};

export const groupOrderCheckoutService = async (creatorId, groupOrderId) => {
  // 1) Lấy group order
  const [groupOrder] = await db
    .select({
      id: groupOrders.id,
      productId: groupOrders.productId,
      couponId: groupOrders.couponId,
      creatorId: groupOrders.creatorId,
      status: groupOrders.status,
    })
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!groupOrder) throw new Error("Không tìm thấy group order");
  if (groupOrder.creatorId !== creatorId)
    throw new Error("Chỉ trưởng nhóm mới được đặt đơn nhóm");
  if (groupOrder.status !== "locked")
    throw new Error("Nhóm chưa đủ điều kiện đặt đơn");

  // 2) Lấy thành viên và kiểm tra
  const members = await db
    .select({
      id: groupOrderMembers.id,
      userId: groupOrderMembers.userId,
      variantId: groupOrderMembers.variantId,
      quantity: groupOrderMembers.quantity,
      hasChosen: groupOrderMembers.hasChosen,
    })
    .from(groupOrderMembers)
    .where(eq(groupOrderMembers.groupOrderId, groupOrderId));

  if (members.some((m) => !m.hasChosen))
    throw new Error("Vẫn còn thành viên chưa chọn sản phẩm");

  // 3) Lấy coupon snapshot
  const [coupon] = groupOrder.couponId
    ? await db.select().from(coupons).where(eq(coupons.id, groupOrder.couponId))
    : [];

  // 4) Lặp từng thành viên -> tạo order riêng
  const createdOrders = [];
  for (const member of members) {
    const items = [{ variantId: member.variantId, quantity: member.quantity }];
    const couponCode = coupon ? coupon.code : null;

    const { order } = await checkoutService(
      member.userId,
      items,
      couponCode,
      null, // dùng địa chỉ mặc định
      "COD",
      false // không phải từ giỏ hàng
    );

    createdOrders.push(order);
  }

  // 5) Cập nhật trạng thái group order -> "ordering"
  await db
    .update(groupOrders)
    .set({ status: "ordering" })
    .where(eq(groupOrders.id, groupOrderId));

  return { orders: createdOrders, groupOrderId };
};

export const leaveGroupOrderService = async ({ userId, groupOrderId }) => {
  // Lấy thông tin group
  const [groupOrder] = await db
    .select()
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!groupOrder) throw new Error("Nhóm không tồn tại");
  if (groupOrder.status !== "pending")
    throw new Error("Chỉ có thể rời nhóm khi nhóm đang ở trạng thái chờ.");

  const [covRow] = await db
    .select({
      conversationId: conversations.id,
    })
    .from(conversations)
    .where(eq(conversations.groupOrderId, groupOrderId))
    .limit(1);

  const conversationId = covRow?.conversationId;
  if (!conversationId) throw new Error("Không tìm thấy conversation của nhóm");

  // Lấy tên người rời
  const [leaver] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Xóa thành viên khỏi nhóm và conversation
  await db
    .delete(groupOrderMembers)
    .where(
      and(
        eq(groupOrderMembers.groupOrderId, groupOrderId),
        eq(groupOrderMembers.userId, userId)
      )
    );

  await db
    .delete(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    );

  let newLeader = null;
  let message = `${leaver?.fullName || "Một thành viên"} đã rời nhóm.`;

  // Nếu là trưởng nhóm -> tìm người kế nhiệm
  if (groupOrder.creatorId === userId) {
    const [candidate] = await db
      .select({
        userId: groupOrderMembers.userId,
        fullName: users.fullName,
      })
      .from(groupOrderMembers)
      .innerJoin(users, eq(users.id, groupOrderMembers.userId))
      .where(eq(groupOrderMembers.groupOrderId, groupOrderId))
      .orderBy(asc(groupOrderMembers.joinedAt))
      .limit(1);

    if (candidate) {
      await db
        .update(groupOrders)
        .set({ creatorId: candidate.userId })
        .where(eq(groupOrders.id, groupOrderId));

      newLeader = candidate;
      message = `${leaver?.fullName || "Trưởng nhóm"} đã rời nhóm. Quyền trưởng nhóm được chuyển cho ${candidate.fullName}.`;
    } else {
      await db.delete(groupOrders).where(eq(groupOrders.id, groupOrderId));
      return {
        deleted: true,
        conversationId,
        message: `${leaver?.fullName || "Trưởng nhóm"} đã rời nhóm. Nhóm đã bị giải tán vì không còn thành viên.`,
      };
    }
  }

  return {
    message,
    newLeader,
    conversationId,
    leaverName: leaver?.fullName || "Một thành viên",
  };
};
