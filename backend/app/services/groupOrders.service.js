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
  groupOrderMemberItems,
  couponProducts,
  orders,
} from "../db/schema.js";
import { checkoutService } from "./order.service.js";
import { groupOrderStatusEnum } from "../enums/groupOrderStatus.enum.js";
import { and, eq, inArray, lt, gte, lte, isNull, sql, asc } from "drizzle-orm";

// lay thong tin group order theo conversationId
export const getGroupOrderDetailService = async (userId, conversationId) => {
  // 1. Lấy thông tin conversation
  const [conv] = await db
    .select({
      id: conversations.id,
      name: conversations.name,
      type: conversations.type,
      groupOrderId: conversations.groupOrderId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) throw new Error("Conversation not found");

  if (!conv.groupOrderId) {
    throw new Error("This conversation is not a group order");
  }

  // 2. Lấy invite link theo conversationId (schema đúng)
  const [invite] = await db
    .select({
      token: inviteLinks.token,
      expiresAt: inviteLinks.expiresAt,
    })
    .from(inviteLinks)
    .where(eq(inviteLinks.conversationId, conversationId))
    .limit(1);

  // 3. Lấy group order
  const [groupOrder] = await db
    .select({
      id: groupOrders.id,
      status: groupOrders.status,
      targetMember: groupOrders.targetMember,
      currentMember: groupOrders.currentMember,
      productId: groupOrders.productId,
      couponId: groupOrders.couponId,
      creatorId: groupOrders.creatorId,
      createdAt: groupOrders.createdAt,
      updatedAt: groupOrders.updatedAt,
    })
    .from(groupOrders)
    .where(eq(groupOrders.id, conv.groupOrderId))
    .limit(1);

  if (!groupOrder) throw new Error("Group order not found");

  // 4. Lấy product
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      price_default: products.price_default,
      stock: products.stock,
      thumbnailUrl: products.thumbnailUrl,
    })
    .from(products)
    .where(eq(products.id, groupOrder.productId));

  // 5. Lấy coupon
  const [coupon] = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      value: coupons.value,
      type: coupons.type,
      kind: coupons.kind,
      endsAt: coupons.endsAt,
      maxMember: coupons.maxMember,
    })
    .from(coupons)
    .where(eq(coupons.id, groupOrder.couponId));

  // 6. Lấy danh sách thành viên trong conversation
  const rawMembers = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      joinedAt: conversationMembers.joinedAt,
      hasChosen: groupOrderMembers.hasChosen,
      memberId: groupOrderMembers.id,
      variantId: groupOrderMemberItems.variantId,
      quantity: groupOrderMemberItems.quantity,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .leftJoin(
      groupOrderMembers,
      and(
        eq(groupOrderMembers.groupOrderId, groupOrder.id),
        eq(groupOrderMembers.userId, conversationMembers.userId)
      )
    )
    .leftJoin(
      groupOrderMemberItems,
      eq(groupOrderMemberItems.memberId, groupOrderMembers.id)
    )
    .where(eq(conversationMembers.conversationId, conversationId));

  const memberMap = new Map();

  for (const row of rawMembers) {
    if (!memberMap.has(row.userId)) {
      memberMap.set(row.userId, {
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        joinedAt: row.joinedAt,
        hasChosen: !!row.hasChosen,
        items: [],
      });
    }

    if (row.variantId) {
      memberMap.get(row.userId).items.push({
        variantId: row.variantId,
        quantity: row.quantity,
      });
    }
  }

  const members = [...memberMap.values()];

  const normalizedMembers = members.map((m) => ({
    ...m,
    hasChosen: !!m.hasChosen,
  }));

  // 7. User có phải thành viên?
  const isMember = normalizedMembers.some((m) => m.userId === userId);

  return {
    conversation: {
      id: conv.id,
      name: conv.name,
      type: conv.type,
    },
    groupOrder,
    product,
    coupon,
    members: normalizedMembers,
    isMember,
    inviteToken: invite?.token ?? null,
  };
};

// Truong nhom dat don cho tat ca thanh vien
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

  // 2) Lấy tất cả member + items của họ
  const rows = await db
    .select({
      memberId: groupOrderMembers.id,
      userId: groupOrderMembers.userId,
      hasChosen: groupOrderMembers.hasChosen,
      variantId: groupOrderMemberItems.variantId,
      quantity: groupOrderMemberItems.quantity,
    })
    .from(groupOrderMembers)
    .leftJoin(
      groupOrderMemberItems,
      eq(groupOrderMemberItems.memberId, groupOrderMembers.id)
    )
    .where(eq(groupOrderMembers.groupOrderId, groupOrderId));

  if (!rows.length)
    throw new Error("Nhóm không có thành viên nào, không thể đặt đơn");

  // 2.1) Kiểm tra tất cả thành viên đã chọn
  const memberChosenMap = new Map(); // memberId -> hasChosen
  for (const r of rows) {
    memberChosenMap.set(r.memberId, r.hasChosen);
  }
  if ([...memberChosenMap.values()].some((v) => !v)) {
    throw new Error("Vẫn còn thành viên chưa chọn sản phẩm");
  }

  // 2.2) Gom items theo userId
  const userItemsMap = new Map(); // userId -> { userId, items: [] }

  for (const r of rows) {
    if (!r.variantId || !r.quantity) continue; // phòng trường hợp dữ liệu rỗng

    if (!userItemsMap.has(r.userId)) {
      userItemsMap.set(r.userId, { userId: r.userId, items: [] });
    }
    userItemsMap.get(r.userId).items.push({
      variantId: r.variantId,
      quantity: r.quantity,
    });
  }

  // Nếu user nào không có item nào -> lỗi
  for (const { userId, items } of userItemsMap.values()) {
    if (!items.length) {
      throw new Error(
        `Có thành viên chưa có sản phẩm nào được chọn (userId=${userId})`
      );
    }
  }

  // 3) Lấy coupon snapshot
  const [coupon] = groupOrder.couponId
    ? await db.select().from(coupons).where(eq(coupons.id, groupOrder.couponId))
    : [];

  // 4) Tạo order riêng cho từng user
  const createdOrders = [];
  for (const { userId, items } of userItemsMap.values()) {
    const couponCode = coupon ? coupon.code : null;

    const { order } = await checkoutService(
      userId,
      items,
      couponCode,

      null, // dùng địa chỉ mặc định
      "COD",
      false, // không phải từ giỏ hàng
      groupOrderId
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

// Roi nhom khi nhom o trang thai pending
export const leaveGroupOrderService = async ({ userId, groupOrderId }) => {
  return await db.transaction(async (tx) => {
    // 1. Check Group
    const [groupOrder] = await tx
      .select()
      .from(groupOrders)
      .where(eq(groupOrders.id, groupOrderId))
      .limit(1);

    if (!groupOrder) throw new Error("Nhóm không tồn tại");
    if (groupOrder.status !== "pending") {
      throw new Error("Chỉ có thể rời nhóm khi trạng thái là pending");
    }

    // 2. Check Conversation
    const [covRow] = await tx
      .select({
        conversationId: conversations.id,
      })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    const conversationId = covRow?.conversationId;
    if (!conversationId) throw new Error("Không tìm thấy conversation");

    // 3. Lấy tên người rời
    const [leaver] = await tx
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // 4. Xóa thành viên khỏi các bảng
    await tx
      .delete(groupOrderMembers)
      .where(
        and(
          eq(groupOrderMembers.groupOrderId, groupOrderId),
          eq(groupOrderMembers.userId, userId)
        )
      );

    await tx
      .delete(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId)
        )
      );

    // 5. Cập nhật số lượng thành viên (Fix 1: update count)
    await tx
      .update(groupOrders)
      .set({
        currentMember: sql`${groupOrders.currentMember} - 1`,
      })
      .where(eq(groupOrders.id, groupOrderId));

    let newLeader = null;
    let message = `${leaver?.fullName || "Một thành viên"} đã rời nhóm.`;

    // 6. Xử lý logic chuyển quyền nếu là Creator
    if (groupOrder.creatorId === userId) {
      const [candidate] = await tx
        .select({
          userId: groupOrderMembers.userId,
          fullName: users.fullName,
        })
        .from(groupOrderMembers)
        .innerJoin(users, eq(users.id, groupOrderMembers.userId))
        .where(eq(groupOrderMembers.groupOrderId, groupOrderId))
        .orderBy(asc(groupOrderMembers.joinedAt)) // Người vào sớm nhất sau Creator
        .limit(1);

      if (candidate) {
        // --- [FIX 2]: Update Group Order Creator ---
        await tx
          .update(groupOrders)
          .set({ creatorId: candidate.userId })
          .where(eq(groupOrders.id, groupOrderId));

        // --- [FIX 3]: Update Conversation Owner ---
        await tx
          .update(conversations)
          .set({ ownerId: candidate.userId })
          .where(eq(conversations.id, conversationId));

        // --- [FIX 4 - QUAN TRỌNG VỚI FE]: Update Invite Link Creator ---
        // Để FE nhận diện đúng "isCreator" cho người mới
        await tx
          .update(inviteLinks)
          .set({ creatorId: candidate.userId })
          .where(eq(inviteLinks.conversationId, conversationId));

        newLeader = candidate;
        message = `${leaver?.fullName || "Trưởng nhóm"} đã rời nhóm. Quyền trưởng nhóm được chuyển cho ${candidate.fullName}.`;
      }

      // Check giải tán nhóm nếu không còn ai
      const [{ count }] = await tx
        .select({ count: sql`COUNT(*)`.mapWith(Number) })
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, conversationId));

      if (count === 0) {
        // Xóa conversation (inviteLinks sẽ tự xóa theo nếu cascade conversationId,
        // nhưng schema inviteLinks của bạn đang reference conversationId unique, cần check cascade ở schema)
        // Schema inviteLinks: .references(() => conversations.id) -> Mặc định NO ACTION nếu ko set onDelete
        // Nên xóa inviteLinks trước cho an toàn nếu schema chưa set cascade
        await tx
          .delete(inviteLinks)
          .where(eq(inviteLinks.conversationId, conversationId));

        await tx
          .delete(conversations)
          .where(eq(conversations.id, conversationId));
        await tx.delete(groupOrders).where(eq(groupOrders.id, groupOrderId));

        return {
          message: "Nhóm đã giải tán.",
          isDisbanded: true,
          conversationId,
        };
      }
    }

    return {
      message,
      newLeader,
      conversationId,
      leaverName: leaver?.fullName || "Một thành viên",
    };
  });
};

// cho phép rời nhóm khi nhóm đã hoàn thành
export const leaveConversationAfterDoneService = async ({
  userId,
  groupOrderId,
}) => {
  // 1) Lấy groupOrder
  const [groupOrder] = await db
    .select()
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!groupOrder) throw new Error("Nhóm không tồn tại");

  if (groupOrder.status !== "completed") {
    throw new Error("Chỉ có thể rời cuộc trò chuyện khi nhóm đã hoàn thành.");
  }

  // 2) Lấy conversation TRƯỚC (Quan trọng: Luôn lấy ID trước khi tác động dữ liệu)
  const [covRow] = await db
    .select({ conversationId: conversations.id })
    .from(conversations)
    .where(eq(conversations.groupOrderId, groupOrderId))
    .limit(1);

  const conversationId = covRow?.conversationId;
  if (!conversationId) throw new Error("Không tìm thấy conversation của nhóm");

  // 3) Lấy tên người rời (để làm message)
  const [leaver] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // 4) Xóa thành viên khỏi conversation_members
  await db
    .delete(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    );

  // 5) Kiểm tra xem còn ai trong nhóm không
  const [{ count }] = await db
    .select({ count: sql`COUNT(*)`.mapWith(Number) })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));

  let isDisbanded = false; // Đổi tên biến 'archived' thành 'isDisbanded' cho khớp Controller

  if (count === 0) {
    // Nếu không còn ai -> Đánh dấu conversation là đã lưu trữ (Archived)
    await db
      .update(conversations)
      .set({
        archived: true,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    isDisbanded = true;
  }

  return {
    conversationId, // ID này luôn tồn tại vì ta không xóa bảng conversations
    isDisbanded, // Trả về true để Controller gửi sự kiện 'group-deleted' (hoặc archived)
    message: `${leaver?.fullName || "Một thành viên"} đã rời cuộc trò chuyện.`,
  };
};

// Chọn sản phẩm và check điều kiện sau khi chọn biển thể + số lượng khi mua chung
export const selectItemsService = async ({ groupOrderId, userId, items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Danh sách sản phẩm không được rỗng");
  }

  // ================================
  // 1. LẤY THÔNG TIN GROUP ORDER
  // ================================
  const [groupOrder] = await db
    .select()
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!groupOrder) throw new Error("Nhóm mua chung không tồn tại");

  // ================================
  // 2. CHỈ CHO CHỌN KHI group.status = LOCKED
  // ================================
  if (groupOrder.status !== groupOrderStatusEnum.LOCKED) {
    throw new Error(
      "Chỉ có thể chọn sản phẩm khi nhóm đang ở trạng thái LOCKED"
    );
  }

  // ================================
  // 3. KIỂM TRA USER CÓ TRONG NHÓM KHÔNG
  // ================================
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
  // ================================
  // 4. LẤY SẢN PHẨM CHÍNH CỦA GROUP
  // ================================
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, groupOrder.productId))
    .limit(1);

  if (!product) throw new Error("Sản phẩm của nhóm bị lỗi");

  // ================================
  // 5. VALIDATE TỪNG ITEM
  // ================================
  const variantIds = items.map((i) => i.variantId);

  const variants = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));

  if (variants.length !== items.length) {
    throw new Error("Có biến thể không tồn tại");
  }

  // Validate variant thuộc đúng product
  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);

    if (!variant) {
      throw new Error("Không tìm thấy biến thể");
    }

    if (variant.productId !== groupOrder.productId) {
      throw new Error("Bạn đang chọn biến thể không thuộc sản phẩm của nhóm");
    }

    if (item.quantity <= 0) {
      throw new Error("Số lượng phải lớn hơn 0");
    }

    if (variant.stock < item.quantity) {
      throw new Error(`Biến thể ${variant.id} không đủ hàng`);
    }
  }

  // ================================
  // 6. VALIDATE COUPON (NẾU CÓ)
  // ================================
  let coupon = null;
  if (groupOrder.couponId) {
    const [c] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, groupOrder.couponId));
    coupon = c;

    if (coupon) {
      const now = new Date();

      // Hạn sử dụng
      if (coupon.startsAt > now || coupon.endsAt < now) {
        throw new Error("Mã giảm giá đã hết hạn");
      }

      // usage_limit
      if (coupon.usage_limit && coupon.used >= coupon.usage_limit) {
        throw new Error("Mã giảm giá đã hết lượt sử dụng");
      }

      // perUserLimit
      const [{ count }] = await db
        .select({ count: sql`COUNT(*)`.mapWith(Number) })
        .from(orders)
        .where(
          and(eq(orders.userId, userId), eq(orders.couponCode, coupon.code))
        );

      if (coupon.perUserLimit && count >= coupon.perUserLimit) {
        throw new Error(
          "Bạn đã sử dụng mã giảm giá này tối đa số lần cho phép"
        );
      }

      // minOrderTotal
      if (coupon.minOrderTotal) {
        let subtotal = 0;
        for (const item of items) {
          const v = variants.find((v) => v.id === item.variantId);
          subtotal += Number(v.price) * item.quantity;
        }
        if (subtotal < coupon.minOrderTotal) {
          throw new Error(
            `Giá trị tối thiểu để áp mã là ${coupon.minOrderTotal}`
          );
        }
      }

      // Nếu coupon áp cho danh sách sản phẩm
      const mapping = await db
        .select()
        .from(couponProducts)
        .where(eq(couponProducts.couponId, coupon.id));

      if (mapping.length > 0) {
        const allowed = mapping.map((m) => m.productId);
        if (!allowed.includes(groupOrder.productId)) {
          throw new Error("Mã giảm giá không áp dụng cho sản phẩm này");
        }
      }
    }
  }

  // ================================
  // 7. LƯU ITEMS MỚI
  // ================================
  // Xóa lựa chọn cũ
  await db
    .delete(groupOrderMemberItems)
    .where(eq(groupOrderMemberItems.memberId, member.id));

  // Thêm lựa chọn mới
  for (const item of items) {
    await db.insert(groupOrderMemberItems).values({
      memberId: member.id,
      variantId: item.variantId,
      quantity: item.quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Set hasChosen
  await db
    .update(groupOrderMembers)
    .set({ hasChosen: true })
    .where(eq(groupOrderMembers.id, member.id));

  return {
    success: true,
    message: "Chọn sản phẩm thành công",
    items,
    couponApplied: coupon ? coupon.code : null,
    isUpdate,
  };
};
