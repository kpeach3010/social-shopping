import { db } from "../db/client.js";
import {
  users,
  orders,
  orderItems,
  cartItems,
  carts,
  productVariants,
  products,
  colors,
  sizes,
  coupons,
  groupOrders,
  conversations,
} from "../db/schema.js";
import { sql, eq, and, ne, inArray, desc, ilike } from "drizzle-orm";
import { getAvailableCouponsForProductsService } from "./coupon.service.js";
import supabase from "../../services/supbase/client.js";

export const restoreStockForItems = async (tx, items) => {
  for (const item of items) {
    // 1. Hoàn kho cho Variant
    if (item.variantId) {
      await tx
        .update(productVariants)
        .set({
          stock: sql`${productVariants.stock} + ${item.quantity}`,
        })
        .where(eq(productVariants.id, item.variantId));
    }

    // 2. Hoàn kho cho Product cha
    if (item.productId) {
      await tx
        .update(products)
        .set({
          stock: sql`${products.stock} + ${item.quantity}`,
        })
        .where(eq(products.id, item.productId));
    }
  }
};

async function copyImageToOrderImages(variant, orderId) {
  if (!variant.imagePath) return { imagePath: null, imageUrl: null };

  const oldPath = variant.imagePath;
  console.log("COPY FROM:", oldPath);

  const fileName = oldPath.split("/").pop();
  const newPath = `order-images/${orderId}/${fileName}`;
  console.log("COPY TO:", newPath);

  const { error } = await supabase.storage
    .from("product-images")
    .copy(oldPath, newPath);

  if (error) {
    console.error("Error copying file:", error);
    return { imagePath: variant.imagePath, imageUrl: variant.imageUrl };
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(newPath);

  return { imagePath: newPath, imageUrl: data.publicUrl };
}

export const checkoutService = async (
  userId,
  items,
  couponCode,
  shipping,
  paymentMethod = "COD",
  fromCart = true,
  groupOrderId = null
) => {
  if (!items || items.length === 0) {
    throw new Error("Đơn hàng phải có ít nhất 1 sản phẩm");
  }

  // 1) Lấy variant details
  const variantIds = items.map((i) => i.variantId);
  const variants = await db
    .select({
      id: productVariants.id,
      price: productVariants.price,
      stock: productVariants.stock,
      productId: productVariants.productId,
      productName: products.name,
      color: colors.name,
      size: sizes.name,
      imageUrl: colors.imageUrl,
      imagePath: colors.imagePath,
    })
    .from(productVariants)
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(colors, eq(productVariants.colorId, colors.id))
    .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
    .where(inArray(productVariants.id, variantIds));

  if (variants.length !== items.length) {
    throw new Error("Có variant không tồn tại");
  }

  // 2) Lấy địa chỉ giao hàng
  let shippingInfo = shipping;
  if (!shippingInfo) {
    const [user] = await db
      .select({
        fullName: users.fullName,
        phone: users.phone,
        province: users.province,
        district: users.district,
        ward: users.ward,
        addressDetail: users.addressDetail,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new Error("Không tìm thấy user");

    shippingInfo = {
      name: user.fullName,
      phone: user.phone,
      province: user.province,
      district: user.district,
      ward: user.ward,
      addressDetail: user.addressDetail,
    };
  }

  // 3) Tính subtotal
  let subtotal = 0;
  const orderItemsData = [];

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) throw new Error("Variant không tồn tại");
    if (variant.stock < item.quantity) {
      throw new Error(`Variant ${variant.id} không đủ hàng`);
    }

    const lineTotal = Number(variant.price) * item.quantity;
    subtotal += lineTotal;

    orderItemsData.push({ variant, quantity: item.quantity });
  }

  // 4) Áp coupon
  let discountTotal = 0;
  if (couponCode) {
    const validCoupons = await getAvailableCouponsForProductsService({
      variantIds: items.map((i) => i.variantId),
      onlyApplicable: true,
    });

    console.log(
      "VariantIds gửi coupon service:",
      items.map((i) => i.variantId)
    );
    console.log("Valid coupons:", validCoupons);

    const coupon = validCoupons.find((c) => c.code === couponCode);

    if (!coupon) throw new Error("Coupon không hợp lệ hoặc không áp dụng được");
    // Kiểm tra tổng số lần sử dụng (usage_limit)
    if (coupon.usage_limit && coupon.used >= coupon.usage_limit) {
      throw new Error("Coupon đã hết số lượt sử dụng");
    }

    // Kiểm tra số lần sử dụng cho mỗi user
    if (coupon.perUserLimit) {
      const [{ count }] = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(orders)
        .where(
          and(eq(orders.userId, userId), eq(orders.couponCode, couponCode))
        );

      if (count >= coupon.perUserLimit) {
        throw new Error(
          `Coupon đã vượt quá số lần sử dụng cho mỗi người (${coupon.perUserLimit} lần)`
        );
      }
    }

    // Kiểm tra giá trị đơn hàng
    if (coupon.minOrderTotal && subtotal < coupon.minOrderTotal) {
      throw new Error(
        `Đơn hàng phải đạt tối thiểu ${coupon.minOrderTotal} mới được áp mã`
      );
    }

    discountTotal =
      coupon.type === "percent"
        ? (subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);
  }

  // 5) Tính total
  const shippingFee = 20000; // demo
  const total = subtotal - discountTotal + shippingFee;

  // 6) Insert order
  const [order] = await db
    .insert(orders)
    .values({
      userId,
      groupOrderId,
      status: "pending",
      paymentMethod,
      subtotal,
      discountTotal,
      shippingFee,
      total,
      couponCode: couponCode ?? null,
      shippingName: shippingInfo.name,
      shippingPhone: shippingInfo.phone,
      province: shippingInfo.province,
      district: shippingInfo.district,
      ward: shippingInfo.ward,
      addressDetail: shippingInfo.addressDetail,
    })
    .returning();

  if (couponCode) {
    await db
      .update(coupons)
      .set({ used: sql`${coupons.used} + 1` })
      .where(eq(coupons.code, couponCode));
  }

  // 7) Copy ảnh + Insert order items + Update stock

  const finalOrderItems = [];
  for (const { variant, quantity } of orderItemsData) {
    console.log("CHECKOUT COPY – imagePath:", variant.imagePath);
    console.log("CHECKOUT COPY – Trying oldPath:", variant.imagePath);
    const copiedImage = await copyImageToOrderImages(variant, order.id);

    const oi = {
      orderId: order.id,
      productId: variant.productId,
      variantId: variant.id,
      productName: variant.productName,
      variantName: `${variant.color || ""} ${variant.size || ""}`.trim(),
      imagePath: copiedImage.imagePath,
      imageUrl: copiedImage.imageUrl,
      price: variant.price,
      quantity,
    };

    await db.insert(orderItems).values(oi);

    await db
      .update(productVariants)
      .set({ stock: variant.stock - quantity })
      .where(eq(productVariants.id, variant.id));

    finalOrderItems.push(oi);
  }

  for (const { variant } of orderItemsData) {
    const [{ totalStock }] = await db
      .select({
        totalStock: sql`SUM(${productVariants.stock})`.mapWith(Number),
      })
      .from(productVariants)
      .where(eq(productVariants.productId, variant.productId));

    await db
      .update(products)
      .set({ stock: totalStock })
      .where(eq(products.id, variant.productId));
  }

  // 8) Xoá cartItems nếu từ giỏ hàng
  if (fromCart && userId) {
    console.log("variantIds xoá cart:", variantIds);

    // Lấy cartId theo userId
    const [cart] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (cart) {
      await db
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cart.id),
            inArray(cartItems.variantId, variantIds)
          )
        );
    }
  }
  return { order, orderItems: finalOrderItems };
};

// CUSTOMER: Hủy đơn
export const cancelOrderService = async (orderId, userId) => {
  // 1) Tìm order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new Error("Đơn hàng không tồn tại");

  const [coupon] = await db
    .select({ kind: coupons.kind })
    .from(coupons)
    .where(eq(coupons.code, order.couponCode))
    .limit(1);

  if (coupon?.kind === "group") {
    throw new Error("Đơn nhóm không thể tự hủy.");
  }

  // 2) Chỉ cho phép user hủy chính order của mình
  if (order.userId !== userId) {
    throw new Error("Không có quyền hủy đơn hàng này");
  }

  // 3) Chỉ cho phép hủy khi pending
  if (order.status !== "pending") {
    throw new Error("Chỉ có thể hủy đơn khi đang ở trạng thái pending");
  }

  // 4) Cập nhật trạng thái thành cancelled
  const [updated] = await db
    .update(orders)
    .set({ status: "cancelled" })
    .where(eq(orders.id, orderId))
    .returning();

  // 5) Hoàn lại stock cho sản phẩm
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    await db
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
      .where(eq(productVariants.id, item.variantId));
  }

  return updated;
};

// Lấy danh sách order của 1 user
export const getOrdersByUserService = async (userId) => {
  // lấy orders của user
  const ordersData = await db
    .select({
      id: orders.id,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      subtotal: orders.subtotal,
      discountTotal: orders.discountTotal,
      shippingFee: orders.shippingFee,
      total: orders.total,
      couponCode: orders.couponCode,
      createdAt: orders.createdAt,
      couponKind: coupons.kind,
    })
    .from(orders)
    .leftJoin(coupons, eq(orders.couponCode, coupons.code))
    .where(eq(orders.userId, userId));

  // lấy items cho tất cả orderId
  const orderIds = ordersData.map((o) => o.id);
  const itemsData = await db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      variantName: orderItems.variantName,
      imageUrl: orderItems.imageUrl,
      price: orderItems.price,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  // gắn items vào orders
  const itemsByOrder = itemsData.reduce((acc, item) => {
    if (!acc[item.orderId]) acc[item.orderId] = [];
    acc[item.orderId].push(item);
    return acc;
  }, {});

  return ordersData.map((order) => ({
    ...order,
    items: itemsByOrder[order.id] || [],
  }));
};

// Lấy chi tiết 1 order của user (bao gồm items)
export const getOrderByIdForUserService = async (orderId, userId) => {
  const [order] = await db
    .select({
      ...orders,
      couponKind: coupons.kind,
    })
    .from(orders)
    .leftJoin(coupons, eq(orders.couponCode, coupons.code))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new Error("Không tìm thấy đơn hàng");

  if (order.userId !== userId) {
    throw new Error("Không có quyền xem đơn hàng này");
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return { ...order, items };
};

// STAFF: xem đơn
// Staff xem tất cả order
export const getOrdersOverviewForStaffService = async () => {
  const ordersList = await db
    .select({
      id: orders.id,
      status: orders.status,
      createdAt: orders.createdAt,
      total: orders.total,

      groupOrderId: orders.groupOrderId,
      groupName: conversations.name,
    })
    .from(orders)
    .leftJoin(
      conversations,
      eq(conversations.groupOrderId, orders.groupOrderId)
    )
    .orderBy(desc(orders.createdAt));

  // Gắn items cho từng order
  for (const order of ordersList) {
    const items = await db
      .select({
        productName: orderItems.productName,
        variantName: orderItems.variantName,
        price: orderItems.price,
        quantity: orderItems.quantity,
        imagePath: orderItems.imagePath,
        imageUrl: orderItems.imageUrl ?? null,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    order.items = items;
  }

  return ordersList;
};

// Staff xem chi tiết order
export const getOrderByIdService = async (orderId) => {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new Error("Không tìm thấy order");

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return { ...order, items };
};

// Heper kiểm tra tất cả đơn của thành viên đã complete chưa
const checkGroupOrderComplete = async (groupOrderId) => {
  console.log(`Kiểm tra groupOrder ${groupOrderId} có hoàn thành chưa...`);

  const list = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.groupOrderId, groupOrderId));

  console.log(`Tổng số đơn trong nhóm: ${list.length}`);
  console.log(`Danh sách trạng thái đơn nhóm:`, list);

  if (list.length === 0) {
    console.log(`GroupOrder ${groupOrderId} không có đơn nào, bỏ qua.`);
    return;
  }

  const allCompleted = list.every((o) => o.status === "completed");

  if (!allCompleted) {
    console.log(`GroupOrder ${groupOrderId} chưa hoàn tất.`);
    return;
  }

  await db
    .update(groupOrders)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(groupOrders.id, groupOrderId));

  console.log(`GroupOrder ${groupOrderId} đã hoàn thành (completed)!`);
};

// STAFF: duyệt hoặc hủy đơn hàng (auto sang complete)
export const updateOrderStatusService = async (orderId, action, staffId) => {
  // 1. Lấy order hiện tại
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new Error("Order không tồn tại");

  // Nếu duyệt đơn
  if (action === "approve") {
    let newStatus;
    if (order.status === "pending") newStatus = "confirmed";
    else if (order.status === "confirmed") newStatus = "completed";
    else throw new Error("Không thể duyệt order ở trạng thái hiện tại");

    // Cập nhật DB
    const [updated] = await db
      .update(orders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    // Auto-complete
    if (newStatus === "confirmed") {
      setTimeout(async () => {
        try {
          const [current] = await db
            .select({ status: orders.status })
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

          if (current?.status !== "confirmed") return;

          await db
            .update(orders)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(orders.id, orderId));

          if (order.groupOrderId) {
            await checkGroupOrderComplete(order.groupOrderId);
          }
          console.log(`Order ${orderId} auto completed`);
        } catch (err) {
          console.error("Auto-complete failed:", err);
        }
      }, 600 * 1000);
    }

    if (newStatus === "completed" && order.groupOrderId) {
      await checkGroupOrderComplete(order.groupOrderId);
    }

    return updated;
  }

  // Nếu từ chối đơn
  else if (action === "reject") {
    if (order.status !== "pending") {
      throw new Error("Chỉ có thể từ chối đơn khi đang pending");
    }

    // A. Nếu là ĐƠN NHÓM -> Dùng Transaction hủy cả nhóm
    if (order.groupOrderId) {
      return await db.transaction(async (tx) => {
        // 1. Hủy nhóm
        await tx
          .update(groupOrders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(groupOrders.id, order.groupOrderId));

        // 2. Từ chối TẤT CẢ đơn trong nhóm
        await tx
          .update(orders)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(eq(orders.groupOrderId, order.groupOrderId));

        // Join bảng orders để lấy items của tất cả đơn thuộc groupOrderId này
        const allGroupItems = await tx
          .select({
            variantId: orderItems.variantId,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(eq(orders.groupOrderId, order.groupOrderId));

        // Thực hiện hoàn kho
        await restoreStockForItems(tx, allGroupItems);

        // 3. Lấy lại đơn hiện tại để trả về
        const [updatedCurrentOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, orderId));

        // 4. Gắn thêm conversationId vào order trả về

        const [conv] = await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(eq(conversations.groupOrderId, order.groupOrderId))
          .limit(1);

        if (conv) updatedCurrentOrder.conversationId = conv.id;

        return updatedCurrentOrder;
      });
    }

    // B. Nếu là ĐƠN LẺ -> Cập nhật bình thường
    const [updated] = await db
      .update(orders)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    //  Lấy items của đơn hàng này
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    //  Hoàn kho
    await restoreStockForItems(db, items);

    return updated;
  } else {
    throw new Error("Hành động không hợp lệ");
  }
};

// xem chi tiết đơn hàng
export const getOrderWithUserInfoByIdService = async (orderId) => {
  // Lấy thông tin đơn hàng, user, coupon (chỉ định rõ trường)
  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      subtotal: orders.subtotal,
      discountTotal: orders.discountTotal,
      shippingFee: orders.shippingFee,
      total: orders.total,
      couponCode: orders.couponCode,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      shippingName: orders.shippingName,
      shippingPhone: orders.shippingPhone,
      province: orders.province,
      district: orders.district,
      ward: orders.ward,
      addressDetail: orders.addressDetail,
      note: orders.note,
      buyer: {
        id: users.id,
        name: users.fullName,
        phone: users.phone,
        address: sql`${users.addressDetail}, ${users.ward}, ${users.district}, ${users.province}`,
      },
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(coupons, eq(orders.couponCode, coupons.code))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new Error("Không tìm thấy order");

  // Lấy danh sách sản phẩm trong đơn
  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      variantId: orderItems.variantId,
      productName: orderItems.productName,
      variantName: orderItems.variantName,
      imagePath: orderItems.imagePath,
      imageUrl: orderItems.imageUrl,
      price: orderItems.price,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return { ...order, items };
};

// Tim kiem don hang theo id
export const searchOrdersByIdService = async (keyword) => {
  if (!keyword || !keyword.trim()) return [];

  const search = `%${keyword.trim()}%`;

  try {
    const baseOrders = await db
      .select()
      .from(orders)
      // FIX: Ép kiểu orders.id sang text để dùng ilike
      .where(ilike(sql`${orders.id}::text`, search));

    if (!baseOrders.length) return [];

    const ids = baseOrders.map((o) => o.id);

    const items = await db
      .select({
        orderId: orderItems.orderId,
        productName: products.name,
        imageUrl: products.thumbnailUrl,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      // FIX: Ép kiểu orderItems.orderId sang text ở đây nữa nếu cần thiết
      .where(ilike(sql`${orderItems.orderId}::text`, search));

    return baseOrders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      total: o.total,
      status: o.status,
      items: items.filter((i) => i.orderId === o.id),
    }));
  } catch (error) {
    console.log("Search orders error:", error);
    throw new Error("Failed to search orders");
  }
};
