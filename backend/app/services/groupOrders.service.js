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
  orderItems,
  colors,
  sizes,
} from "../db/schema.js";
import {
  checkoutService,
  changeOrderPaymentMethodToCodBase,
  processOrderRefund,
  formatVND,
} from "./order.service.js";
import { groupOrderStatusEnum } from "../enums/groupOrderStatus.enum.js";
import { restoreStockForItems } from "./order.service.js";
import { createNotificationService } from "./notification.service.js";
import { createSystemMessage } from "./message.service.js";
import { and, eq, inArray, sql, asc, ne } from "drizzle-orm";

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

  // 3.1. Tính toán khả năng cho phép hủy đơn nhóm sau khi đã đặt (ordering)
  // Chỉ cho phép hủy khi:
  //  - Trạng thái group = "ordering"
  //  - Tất cả các đơn con vẫn còn ở trạng thái "pending" (chưa được nhân viên xác nhận/xử lý)
  let canCancelGroupOrder = false;
  if (groupOrder.status === "ordering") {
    const processedOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.groupOrderId, groupOrder.id),
          ne(orders.status, "pending"),
          ne(orders.status, "cancelled"),
        ),
      )
      .limit(1);

    canCancelGroupOrder = processedOrders.length === 0;
  }

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
      minOrderTotal: coupons.minOrderTotal,
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
      colorName: colors.name,
      colorImageUrl: colors.imageUrl,
      sizeName: sizes.name,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .leftJoin(
      groupOrderMembers,
      and(
        eq(groupOrderMembers.groupOrderId, groupOrder.id),
        eq(groupOrderMembers.userId, conversationMembers.userId),
      ),
    )
    .leftJoin(
      groupOrderMemberItems,
      eq(groupOrderMemberItems.memberId, groupOrderMembers.id),
    )
    .leftJoin(
      productVariants,
      eq(groupOrderMemberItems.variantId, productVariants.id),
    )
    .leftJoin(colors, eq(productVariants.colorId, colors.id))
    .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
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
        colorName: row.colorName,
        colorImageUrl: row.colorImageUrl,
        sizeName: row.sizeName,
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
    canCancelGroupOrder,
    product,
    coupon,
    members: normalizedMembers,
    isMember,
    inviteToken: invite?.token ?? null,
  };
};

// Truong nhom dat don cho tat ca thanh vien
export const groupOrderCheckoutService = async (
  creatorId,
  groupOrderId,
  paymentMethod = "COD",
) => {
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
      eq(groupOrderMemberItems.memberId, groupOrderMembers.id),
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
        `Có thành viên chưa có sản phẩm nào được chọn (userId=${userId})`,
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
      paymentMethod, // COD hoặc PAYPAL
      false, // không phải từ giỏ hàng
      groupOrderId,
    );

    createdOrders.push(order);
  }

  // 5) Cập nhật trạng thái group order
  // COD → "ordering" (trực tiếp gửi shop)
  // PAYPAL → "awaiting_payment" (chờ trưởng nhóm thanh toán trong 30p)
  const newGroupStatus =
    paymentMethod === "COD" ? "ordering" : "awaiting_payment";

  await db
    .update(groupOrders)
    .set({
      status: newGroupStatus,
      updatedAt: new Date(), // track thời gian để timeout
    })
    .where(eq(groupOrders.id, groupOrderId));

  return {
    orders: createdOrders,
    groupOrderId,
    paymentMethod,
    status: newGroupStatus,
  };
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
          eq(groupOrderMembers.userId, userId),
        ),
      );

    await tx
      .delete(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
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
        // Xóa conversation
        await tx
          .delete(inviteLinks)
          .where(eq(inviteLinks.conversationId, conversationId));

        await tx
          .delete(conversations)
          .where(eq(conversations.id, conversationId));
        await tx.delete(groupOrders).where(eq(groupOrders.id, groupOrderId));

        // Plan V11: Trigger thông báo cho các nhóm bị ảnh hưởng (Do nhóm bị giải tán làm giảm tổng cầu)
        notifyAffectedGroups(groupOrder.productId).catch((err) =>
          console.error("Error in notifyAffectedGroups trigger (Disband):", err)
        );

        return {
          message: "Nhóm đã bị giải tán do tất cả thành viên rời khỏi.",
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

  if (groupOrder.status !== "completed" && groupOrder.status !== "cancelled") {
    throw new Error(
      "Chỉ có thể rời cuộc trò chuyện khi nhóm đã hoàn thành hoặc đã hủy.",
    );
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
        eq(conversationMembers.userId, userId),
      ),
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

      return {
        conversationId,
        isDisbanded,
        message: "Nhóm đã giải tán do tất cả thành viên rời khỏi.",
      };
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
      "Chỉ có thể chọn sản phẩm khi nhóm đang ở trạng thái LOCKED",
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
        eq(groupOrderMembers.userId, userId),
      ),
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
          and(eq(orders.userId, userId), eq(orders.couponCode, coupon.code)),
        );

      if (coupon.perUserLimit && count >= coupon.perUserLimit) {
        throw new Error(
          "Bạn đã sử dụng mã giảm giá này tối đa số lần cho phép",
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
            `Giá trị tối thiểu để áp mã là ${coupon.minOrderTotal}`,
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
  // 7. LƯU ITEMS MỚI (Bulk Insert)
  // ================================
  // Xóa lựa chọn cũ
  await db
    .delete(groupOrderMemberItems)
    .where(eq(groupOrderMemberItems.memberId, member.id));

  // Thêm lựa chọn mới theo kiểu bulk insert
  if (items.length > 0) {
    const valuesToInsert = items.map((item) => ({
      memberId: member.id,
      variantId: item.variantId,
      quantity: item.quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.insert(groupOrderMemberItems).values(valuesToInsert);
  }

  // Set hasChosen
  await db
    .update(groupOrderMembers)
    .set({ hasChosen: true, updatedAt: new Date() })
    .where(eq(groupOrderMembers.id, member.id));

  // Lấy dữ liệu enrichment (màu/size) để trả về cho Controller emit socket luôn
  const enrichedItems = await db
    .select({
      variantId: productVariants.id,
      colorName: colors.name,
      colorImageUrl: colors.imageUrl,
      sizeName: sizes.name,
      quantity: groupOrderMemberItems.quantity,
    })
    .from(groupOrderMemberItems)
    .innerJoin(productVariants, eq(groupOrderMemberItems.variantId, productVariants.id))
    .leftJoin(colors, eq(productVariants.colorId, colors.id))
    .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
    .where(eq(groupOrderMemberItems.memberId, member.id));

  const result = {
    success: true,
    message: "Chọn sản phẩm thành công",
    items: enrichedItems, // Trả về items đã có đủ thông tin màu/size
    couponApplied: coupon ? coupon.code : null,
    isUpdate,
  };

  // Plan V11: Trigger thông báo cho các nhóm bị ảnh hưởng
  // (Không await để không làm chậm response của user hiện tại)
  notifyAffectedGroups(groupOrder.productId, false).catch(err => 
    console.error("Error in notifyAffectedGroups trigger:", err)
  );

  return result;
};

// Trưởng nhóm hủy đơn nhóm khi tất cả đơn chưa được xác nhận
export const cancelGroupOrderAfterCheckoutService = async (
  groupOrderId,
  userId,
) => {
  // 1. Lấy thông tin nhóm
  const [group] = await db
    .select()
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!group) throw new Error("Nhóm không tồn tại");

  // 2. Kiểm tra quyền trưởng nhóm
  if (group.creatorId !== userId) {
    throw new Error("Chỉ trưởng nhóm mới có quyền hủy đơn nhóm");
  }

  // 3. Kiểm tra trạng thái nhóm
  if (group.status !== "ordering") {
    throw new Error("Trạng thái nhóm không hợp lệ");
  }

  // 4. Kiểm tra xem có đơn hàng nào đã được xác nhận chưa
  const processedOrders = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(
      and(
        eq(orders.groupOrderId, groupOrderId),
        ne(orders.status, "pending"),
        ne(orders.status, "cancelled"),
      ),
    )
    .limit(1);

  // Nếu tìm thấy dù chỉ 1 đơn đã xử lý  -> Chặn hủy
  if (processedOrders.length > 0) {
    throw new Error("Không thể hủy nhóm khi có đơn đã được xác nhận");
  }

  // 5. Thực hiện Transaction hủy nhóm
  return await db.transaction(async (tx) => {
    // 5.1 Cập nhật trạng thái nhóm -> Quay lại Locked thay vì Cancelled
    await tx
      .update(groupOrders)
      .set({ status: "locked", updatedAt: new Date() })
      .where(eq(groupOrders.id, groupOrderId));

    // --- HOÀN LƯỢT SỬ DỤNG COUPON TỪ CÁC ĐƠN CON ---
    const groupOrds = await tx
      .select({ id: orders.id, couponCode: orders.couponCode })
      .from(orders)
      .where(
        and(
          eq(orders.groupOrderId, groupOrderId),
          ne(orders.status, "cancelled")
        )
      );

    const couponCodes = [
      ...new Set(
        groupOrds
          .map((o) => o.couponCode)
          .filter((code) => !!code),
      ),
    ];

    for (const couponCode of couponCodes) {
      const usedCount = groupOrds.filter((o) => o.couponCode === couponCode).length;
      await tx
        .update(coupons)
        .set({
          used: sql`GREATEST(0, ${coupons.used} - ${usedCount})`,
        })
        .where(eq(coupons.code, couponCode));
    }

    // 5.2 Cập nhật trạng thái TẤT CẢ đơn con -> Cancelled
    await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(orders.groupOrderId, groupOrderId),
          ne(orders.status, "cancelled")
        )
      );

    // Lấy tất cả items của các đơn trong nhóm để hoàn kho
    const allGroupItems = await tx
      .select({
        variantId: orderItems.variantId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.groupOrderId, groupOrderId),
          ne(orders.status, "cancelled")
        )
      );

    // gọi hàm hoàn kho với danh sách items vừa lấy
    if (allGroupItems.length > 0) {
      await restoreStockForItems(tx, allGroupItems);
    }

    // 5.4 Hoàn tiền DUY NHẤT cho trưởng nhóm (người thanh toán) nếu cần
    let refundResult = { isSuccess: false };
    const [leaderOrder] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.groupOrderId, groupOrderId),
          eq(orders.userId, userId),
        ),
      )
      .limit(1);

    if (leaderOrder) {
      refundResult = await processOrderRefund(leaderOrder);
    }

    // Tính tổng số tiền hoàn cho toàn bộ nhóm để gửi thông báo hoàn tiền chính xác
    const allGroupOrders = await tx
      .select({ total: orders.total })
      .from(orders)
      .where(eq(orders.groupOrderId, groupOrderId));
      
    const totalRefundAmount = allGroupOrders.reduce(
      (sum, ord) => sum + Number(ord.total),
      0,
    );

    // 5.5 Lấy thông tin phòng chat để bắn socket
    const [conv] = await tx
      .select({ id: conversations.id, name: conversations.name })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    return {
      success: true,
      groupOrderId,
      conversationId: conv ? conv.id : null,
      groupName: conv?.name || "Nhóm mua chung",
      productId: group.productId,
      refundSuccess: refundResult.isSuccess,
      refundAmount: refundResult.isSuccess ? totalRefundAmount : 0,
    };
  });
};

// Trưởng nhóm giải tán nhóm
export const disbandGroupOrderService = async (groupOrderId, userId) => {
  // 1. Lấy thông tin nhóm và sản phẩm
  const [group] = await db
    .select({
      id: groupOrders.id,
      creatorId: groupOrders.creatorId,
      status: groupOrders.status,
      productId: groupOrders.productId,
    })
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!group) throw new Error("Nhóm không tồn tại");

  // 2. Phân quyền: Chỉ trưởng nhóm được giải tán
  if (group.creatorId !== userId) {
    throw new Error("Chỉ trưởng nhóm mới có quyền giải tán nhóm");
  }

  // 3. Kiểm tra trạng thái: Không giải tán khi ordering / awaiting_payment
  if (group.status === "ordering" || group.status === "awaiting_payment") {
    throw new Error(
      `Không thể giải tán nhóm lúc này (Đang ở trạng thái ${group.status})`,
    );
  }

  // Lấy thông tin cuộc trò chuyện (để lấy được tên nhóm trước khi xoá)
  const [conv] = await db
    .select({ id: conversations.id, name: conversations.name })
    .from(conversations)
    .where(eq(conversations.groupOrderId, groupOrderId))
    .limit(1);

  const conversationId = conv?.id;
  const groupName = conv?.name || "Nhóm mua chung";

  // Lấy URL hình ảnh sản phẩm
  const [product] = await db
    .select({ thumbnailUrl: products.thumbnailUrl })
    .from(products)
    .where(eq(products.id, group.productId))
    .limit(1);
    
  const imageUrl = product?.thumbnailUrl || null;

  // Lấy danh sách thành viên HIỆN TẠI trong nhóm để gửi Notification (trừ trưởng nhóm)
  const membersWithInfo = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));

  const notifiedUserIds = membersWithInfo
    .map((m) => m.userId)
    .filter((id) => id !== userId);

    // 4. Bắt đầu xử lý tuỳ theo trạng thái
    return await db.transaction(async (tx) => {
      let mode = "";
      let oldStatus = null;

      if (group.status === "pending" || group.status === "locked") {
        mode = "deleted";
        oldStatus = group.status;

        if (conversationId) {
          await tx
            .delete(inviteLinks)
            .where(eq(inviteLinks.conversationId, conversationId));
          await tx
            .delete(conversations)
            .where(eq(conversations.id, conversationId));
        }

        await tx.delete(groupOrders).where(eq(groupOrders.id, groupOrderId));
      } else if (group.status === "completed" || group.status === "cancelled") {
        mode = "archived";
        oldStatus = group.status;

        if (conversationId) {
          await tx
            .update(conversations)
            .set({ archived: true, updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));
        }
      } else {
        throw new Error(`Trạng thái không hợp lệ: ${group.status}`);
      }

      return {
        success: true,
        mode,
        conversationId,
        groupName,
        oldStatus,
        allMemberIds: [userId, ...notifiedUserIds], // Trả về cả list để controller gửi ntf
        imageUrl,
        productId: group.productId,
      };
    });
};

// Trưởng nhóm đổi phương thức thanh toán từ online -> COD khi nhóm đang chờ thanh toán
export const changeGroupOrderPaymentMethodService = async ({
  userId,
  groupOrderId,
  newPaymentMethod,
}) => {
  if (newPaymentMethod !== "COD") {
    throw new Error("Hiện chỉ hỗ trợ đổi sang thanh toán COD");
  }

  return await db.transaction(async (tx) => {
    const [group] = await tx
      .select()
      .from(groupOrders)
      .where(eq(groupOrders.id, groupOrderId))
      .limit(1);

    if (!group) throw new Error("Nhóm không tồn tại");

    if (group.creatorId !== userId) {
      throw new Error(
        "Chỉ trưởng nhóm mới có quyền đổi phương thức thanh toán",
      );
    }

    if (group.status !== "awaiting_payment") {
      throw new Error(
        "Chỉ có thể đổi phương thức khi nhóm đang chờ thanh toán (awaiting_payment)",
      );
    }

    // Lấy tất cả đơn trong nhóm để kiểm tra và cập nhật
    const groupOrdersList = await tx
      .select({
        id: orders.id,
        status: orders.status,
        isPaid: orders.isPaid,
      })
      .from(orders)
      .where(
        and(
          eq(orders.groupOrderId, groupOrderId),
          ne(orders.status, "cancelled"),
          ne(orders.status, "rejected")
        )
      );

    const hasProcessedOrder = groupOrdersList.some(
      (o) => o.isPaid || o.status !== "awaiting_payment",
    );

    if (hasProcessedOrder) {
      throw new Error(
        "Không thể đổi phương thức vì đã có đơn trong nhóm được xử lý hoặc thanh toán",
      );
    }

    // Tái sử dụng helper đổi phương thức thanh toán của đơn lẻ cho từng đơn trong nhóm
    for (const go of groupOrdersList) {
      await changeOrderPaymentMethodToCodBase(tx, {
        orderId: go.id,
        userId,
        skipUserCheck: true, // trưởng nhóm có quyền đổi cho tất cả đơn trong nhóm
      });
    }

    // Cập nhật trạng thái group order sang "ordering" giống như checkout COD
    const [updatedGroup] = await tx
      .update(groupOrders)
      .set({ status: "ordering", updatedAt: new Date() })
      .where(eq(groupOrders.id, groupOrderId))
      .returning();

    return {
      success: true,
      groupOrderId,
      status: updatedGroup.status,
      paymentMethod: "COD",
    };
  });
};

// Trưởng nhóm đổi sản phẩm mua chung khi nhóm ở trạng thái pending/locked
export const changeGroupOrderProductService = async ({
  userId,
  groupOrderId,
  newProductId,
}) => {
  // 1. Lấy thông tin group order
  const [groupOrder] = await db
    .select()
    .from(groupOrders)
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!groupOrder) throw new Error("Nhóm không tồn tại");

  // 2. Kiểm tra quyền trưởng nhóm
  if (groupOrder.creatorId !== userId) {
    throw new Error("Chỉ trưởng nhóm mới có quyền đổi sản phẩm");
  }

  // 3. Kiểm tra trạng thái nhóm
  if (
    groupOrder.status !== groupOrderStatusEnum.PENDING &&
    groupOrder.status !== groupOrderStatusEnum.LOCKED
  ) {
    throw new Error(
      "Chỉ được đổi sản phẩm khi nhóm ở trạng thái pending hoặc locked",
    );
  }

  // 4. Kiểm tra productId mới
  if (groupOrder.productId === newProductId) {
    throw new Error("Sản phẩm mới phải khác sản phẩm hiện tại");
  }

  // 5. Kiểm tra sản phẩm mới tồn tại (và active nếu có status)
  const [newProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, newProductId))
    .limit(1);
  if (!newProduct) throw new Error("Sản phẩm mới không tồn tại");
  // 5.5 Kiểm tra xem có thành viên nào đã tham gia nhóm mua chung đang hoạt động với sản phẩm mới chưa
  const currentMembers = await db
    .select({ userId: groupOrderMembers.userId, fullName: users.fullName })
    .from(groupOrderMembers)
    .innerJoin(users, eq(groupOrderMembers.userId, users.id))
    .where(eq(groupOrderMembers.groupOrderId, groupOrderId));

  const currentUserIds = currentMembers.map((m) => m.userId);

  if (currentUserIds.length > 0) {
    const activeGroupsWithProduct = await db
      .select({ fullName: users.fullName })
      .from(groupOrderMembers)
      .innerJoin(groupOrders, eq(groupOrderMembers.groupOrderId, groupOrders.id))
      .innerJoin(users, eq(groupOrderMembers.userId, users.id))
      .where(
        and(
          inArray(groupOrderMembers.userId, currentUserIds),
          eq(groupOrders.productId, newProductId),
          ne(groupOrders.id, groupOrderId),
          inArray(groupOrders.status, [
            groupOrderStatusEnum.PENDING,
            groupOrderStatusEnum.LOCKED,
            groupOrderStatusEnum.ORDERING,
            groupOrderStatusEnum.AWAITING_PAYMENT,
          ]),
        ),
      );

    if (activeGroupsWithProduct.length > 0) {
      const busyNames = [
        ...new Set(activeGroupsWithProduct.map((m) => m.fullName)),
      ].join(", ");
      throw new Error(
        `Không thể đổi sản phẩm vì các thành viên sau đang có nhóm mua chung khác hoạt động với sản phẩm này: ${busyNames}`,
      );
    }
  }

  // 6. Nếu nhóm đã có order (status >= ordering) thì chặn đổi
  if (
    groupOrder.status === groupOrderStatusEnum.ORDERING ||
    groupOrder.status === groupOrderStatusEnum.COMPLETED ||
    groupOrder.status === groupOrderStatusEnum.CANCELLED
  ) {
    throw new Error(
      "Không thể đổi sản phẩm khi nhóm đã đặt đơn hoặc đã hoàn thành/hủy",
    );
  }

  // 7. Kiểm tra coupon nếu có
  if (groupOrder.couponId) {
    // 7.1 Lấy thông tin coupon
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, groupOrder.couponId))
      .limit(1);
    if (!coupon) throw new Error("Mã giảm giá không tồn tại");

    const now = new Date();
    // 7.2 Kiểm tra thời gian hiệu lực
    if (coupon.startsAt > now || coupon.endsAt < now) {
      throw new Error("Mã giảm giá đã hết hạn");
    }
    // 7.3 Kiểm tra usage_limit nếu enforce ở đây
    if (coupon.usage_limit && coupon.used >= coupon.usage_limit) {
      throw new Error("Mã giảm giá đã hết lượt sử dụng");
    }
    // 7.4 Kiểm tra coupon áp dụng cho sản phẩm mới
    // Nếu coupon có record trong coupon_products thì chỉ áp cho các sản phẩm đó
    const mapping = await db
      .select()
      .from(couponProducts)
      .where(eq(couponProducts.couponId, coupon.id));
    if (mapping.length > 0) {
      const allowed = mapping.map((m) => m.productId);
      if (!allowed.includes(newProductId)) {
        throw new Error("Sản phẩm mới không áp dụng được mã giảm giá hiện tại");
      }
    }
    // Nếu không có record nào thì hiểu là áp cho mọi sản phẩm
  }

  // 8. Transaction: update productId, reset lựa chọn, update invite_links
  return await db.transaction(async (tx) => {
    // 8.1 Update group_orders.product_id
    await tx
      .update(groupOrders)
      .set({ productId: newProductId, updatedAt: new Date() })
      .where(eq(groupOrders.id, groupOrderId));

    // 8.2 Lấy memberIds
    const memberRows = await tx
      .select({ id: groupOrderMembers.id })
      .from(groupOrderMembers)
      .where(eq(groupOrderMembers.groupOrderId, groupOrderId));
    const memberIds = memberRows.map((m) => m.id);

    if (memberIds.length > 0) {
      // 8.3 Xoá toàn bộ lựa chọn đã chọn
      await tx
        .delete(groupOrderMemberItems)
        .where(inArray(groupOrderMemberItems.memberId, memberIds));

      // 8.4 Update group_order_members set has_chosen = false
      await tx
        .update(groupOrderMembers)
        .set({ hasChosen: false, updatedAt: new Date() })
        .where(inArray(groupOrderMembers.id, memberIds));
    }

    // 8.5 Update invite_links.productId (nếu có link)
    await tx
      .update(inviteLinks)
      .set({ productId: newProductId })
      .where(
        eq(
          inviteLinks.conversationId,
          groupOrder.conversationId ||
            (
              await tx
                .select({ conversationId: conversations.id })
                .from(conversations)
                .where(eq(conversations.groupOrderId, groupOrderId))
                .limit(1)
            )[0]?.conversationId,
        ),
      );
    return { success: true };
  });
};

/**
 * Tính tổng nhu cầu (Demand) của tất cả các nhóm đang mua sản phẩm này
 * (Chỉ tính các nhóm ở trạng thái PENDING hoặc LOCKED)
 */
export const calculateProductGlobalDemand = async (productId) => {
  const activeGroups = await db
    .select({
      targetMember: groupOrders.targetMember,
      minOrderTotal: coupons.minOrderTotal,
      productPrice: products.price_default,
    })
    .from(groupOrders)
    .innerJoin(products, eq(groupOrders.productId, products.id))
    .leftJoin(coupons, eq(groupOrders.couponId, coupons.id))
    .where(
      and(
        eq(groupOrders.productId, productId),
        inArray(groupOrders.status, ["pending", "locked", "ordering"]) // Tính cả ordering vì đang trong quá trình checkout
      )
    );

  let totalDemandQty = 0;
  for (const g of activeGroups) {
    const minTotal = Number(g.minOrderTotal) || 0;
    const price = Number(g.productPrice) || 1;
    const qtyPerMember = Math.ceil(minTotal / price) || 1; // Tối thiểu 1 sản phẩm/người
    totalDemandQty += g.targetMember * qtyPerMember;
  }
  return totalDemandQty;
};

/**
 * Kiểm tra trạng thái kho của một nhóm cụ thể
 * Trả về: 'insufficient' | 'competing' | 'normal' | 'low_stock'
 */
export const checkGroupStockStatus = async (groupOrderId) => {
  const [group] = await db
    .select({
      id: groupOrders.id,
      productId: groupOrders.productId,
      targetMember: groupOrders.targetMember,
      minOrderTotal: coupons.minOrderTotal,
      productStock: products.stock,
      productPrice: products.price_default,
    })
    .from(groupOrders)
    .innerJoin(products, eq(groupOrders.productId, products.id))
    .leftJoin(coupons, eq(groupOrders.couponId, coupons.id))
    .where(eq(groupOrders.id, groupOrderId))
    .limit(1);

  if (!group) return "normal";

  // Calculate group's demand in quantity
  const minTotal = Number(group.minOrderTotal) || 0;
  const price = Number(group.productPrice) || 1;
  const qtyPerMember = Math.ceil(minTotal / price) || 1; // Tối thiểu 1 sản phẩm/người
  const groupDemandQty = group.targetMember * qtyPerMember;

  const totalStockQty = group.productStock; // This is already quantity
  const globalDemandQty = await calculateProductGlobalDemand(group.productId);

  if (totalStockQty < groupDemandQty) {
    return "insufficient"; // Không đủ cho chính nhóm này
  } else if (totalStockQty < globalDemandQty) {
    return "competing"; // Đủ cho nhóm này nhưng đang tranh chấp với các nhóm khác
  } else if (totalStockQty - groupDemandQty <= 10) {
    return "low_stock"; // Sắp hết hàng dù chưa tranh chấp (dư ít hơn hoặc bằng 10)
  }
  return "normal"; // Kho an toàn
};

/**
 * Phát tán thông báo cho các nhóm bị ảnh hưởng bởi thay đổi tồn kho của sản phẩm
 */
export const notifyAffectedGroups = async (productId, isStockUp = false) => {
  try {
    // 0. Lấy thông tin sản phẩm (stock và thumbnail)
    const [product] = await db
      .select({ 
        stock: products.stock, 
        thumbnailUrl: products.thumbnailUrl 
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) return;

    // 1. Tìm tất cả các nhóm đang PENDING hoặc LOCKED hoặc ORDERING của sản phẩm này
    const affectedGroups = await db
      .select({
        id: groupOrders.id,
        conversationId: conversations.id,
        groupName: conversations.name,
        targetMember: groupOrders.targetMember,
        lastStockStatus: groupOrders.lastStockStatus,
      })
      .from(groupOrders)
      .leftJoin(conversations, eq(groupOrders.id, conversations.groupOrderId))
      .where(
        and(
          eq(groupOrders.productId, productId),
          inArray(groupOrders.status, ["pending", "locked", "ordering"])
        )
      );

    if (affectedGroups.length === 0) return;

    for (const group of affectedGroups) {
      const status = await checkGroupStockStatus(group.id);
      
      // CHỈ THÔNG BÁO NẾU TRẠNG THÁI THAY ĐỔI (Tránh lặp lại thông báo khi Staff cập nhật kho nhiều lần)
      if (status === group.lastStockStatus) continue;

      // Cập nhật trạng thái mới nhất vào DB để không lặp lại thông báo
      await db
        .update(groupOrders)
        .set({ lastStockStatus: status, updatedAt: new Date() })
        .where(eq(groupOrders.id, group.id));
      let messageContent = "";
      let ntfContent = "";
      let ntfTitle = "";
      let ntfType = "";

      const gName = group.groupName || "Nhóm mình";

      if (status === "insufficient") {
        messageContent = `⚠️ THÔNG BÁO: Hiện tại tồn kho của sản phẩm không đủ`;
        ntfContent = `Sản phẩm trong nhóm "${gName}" hiện đang không đủ đáp ứng số lượng nhóm cần. Hãy thay đổi sản phẩm mua chung hoặc chờ đợt hàng sau nhé!`;
        ntfTitle = `[${gName}] Tồn kho không đủ!`;
        ntfType = "group_stock_warning";
      } else if (isStockUp && group.lastStockStatus === "insufficient") {
        // TRƯỜNG HỢP ƯU TIÊN: Hàng đã về sau khi từng bị hết (insufficient -> any)
        messageContent = `📣 THÔNG BÁO: Sản phẩm của nhóm đã có hàng trở lại!`;
        if (status === "low_stock" || status === "competing") {
          messageContent += ` Tuy nhiên số lượng vẫn còn khá ít!`;
        }
        ntfContent = `Sản phẩm trong nhóm "${gName}" đã về thêm. Vào hoàn tất đơn hàng ngay thôi nào!`;
        ntfTitle = `[${gName}] Hàng đã về thêm!`;
        ntfType = "group_stock_recovered";
      } else if (status === "competing") {
        messageContent = `🔥 CẢNH BÁO: Sản phẩm này đang được rất nhiều nhóm săn đón và có thể hết hàng bất cứ lúc nào`;
        ntfContent = `Nhiều nhóm đang cùng đặt sản phẩm này. Hãy nhanh tay chốt đơn kẻo lỡ nhé!`;
        ntfTitle = `[${gName}] Sắp hết hàng - Chốt ngay!`;
        ntfType = "group_stock_warning";
      } else if (status === "low_stock") {
        messageContent = `📢 LƯU Ý: Sản phẩm mua chung hiện chỉ còn rất ít trong kho`;
        ntfContent = `Sản phẩm trong nhóm "${gName}" sắp hết hàng. Hãy nhanh tay hoàn tất đơn hàng nhé!`;
        ntfTitle = `[${gName}] Sắp hết hàng!`;
        ntfType = "group_stock_warning";
      } else if (status === "normal" && isStockUp) {
        messageContent = `📣 THÔNG BÁO: Sản phẩm của nhóm đã có hàng trở lại!`;
        ntfContent = `Sản phẩm trong nhóm "${gName}" đã về thêm. Vào hoàn tất đơn hàng ngay thôi nào!`;
        ntfTitle = `[${gName}] Hàng đã về thêm!`;
        ntfType = "group_stock_recovered";
      }

      if (messageContent && group.conversationId) {
        // A. Gửi System Message vào Chat
        const sysMsg = await createSystemMessage(group.conversationId, messageContent);
        
        // Emit Socket.io cho Chat (Realtime)
        if (global.io) {
          global.io.to(group.conversationId).emit("message", {
            id: sysMsg.id,
            conversationId: group.conversationId,
            content: messageContent,
            type: "system",
            senderId: "00000000-0000-0000-0000-000000000000",
            senderFullName: "Hệ thống",
            imageUrl: product.thumbnailUrl, // Thêm ảnh vào Chat
            createdAt: sysMsg.createdAt,
          });
        }

        // B. Gửi Notification cho tất cả thành viên trong nhóm
        const members = await db
          .select({ userId: groupOrderMembers.userId })
          .from(groupOrderMembers)
          .where(eq(groupOrderMembers.groupOrderId, group.id));

        for (const member of members) {
          try {
            const notification = await createNotificationService({
              userId: member.userId,
              type: ntfType,
              title: ntfTitle,
              content: ntfContent,
              imageUrl: product.thumbnailUrl,
              relatedEntityType: "group_order",
              relatedEntityId: group.id,
              actionUrl: `/conversation/${group.conversationId}`
            });

            // Emit Socket.io cho Notification (Realtime)
            if (global.io && member.userId) {
              global.io.to(String(member.userId)).emit("notification:new", { notification });
            }
          } catch (ntfErr) {
            console.error(`Error creating notification for user ${member.userId}:`, ntfErr);
          }
        }
      }
    }
  } catch (err) {
    console.error("Lỗi trong notifyAffectedGroups:", err);
  }
};
