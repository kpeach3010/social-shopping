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
  couponProducts,
} from "../db/schema.js";
import { sql, eq, and, ne, inArray, desc } from "drizzle-orm";
import { getAvailableCouponsForProductsService } from "./coupon.service.js";
import supabase from "../../services/supbase/client.js";

async function copyImageToOrderImages(variant, orderId) {
  if (!variant.imagePath) return { imagePath: null, imageUrl: null };

  const oldPath = variant.imagePath; // ví dụ: categories/shirt/shirt-1/productId123/variants/RED.png
  const fileName = oldPath.split("/").pop();
  const newPath = `order-images/${orderId}/${fileName}`;

  const { error } = await supabase.storage
    .from("product-images")
    .copy(oldPath, newPath);

  if (error) {
    console.error("Error copying file to order-images:", error);
    return { imagePath: variant.imagePath, imageUrl: variant.imageUrl };
  }

  const { data: publicUrl } = supabase.storage
    .from("product-images")
    .getPublicUrl(newPath);

  return { imagePath: newPath, imageUrl: publicUrl.publicUrl };
}

export const checkoutService = async (
  userId,
  items,
  couponCode,
  shipping,
  paymentMethod = "COD"
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
    const validCoupons = await getAvailableCouponsForProductsService(
      items.map((i) => i.variantId)
    );
    const coupon = validCoupons.find(
      (c) => c.code === couponCode && c.applicable
    );

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
  const ordersList = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  // lấy items cho từng order
  for (const order of ordersList) {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    order.items = items; // gắn vào order
  }

  return ordersList;
};

// Lấy chi tiết 1 order của user (bao gồm items)
export const getOrderByIdForUserService = async (orderId, userId) => {
  const [order] = await db
    .select()
    .from(orders)
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
    })
    .from(orders)
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
        imageUrl: orderItems.imageUrl,
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

// STAFF: duyệt hoặc hủy đơn hàng
export const updateOrderStatusService = async (orderId, action, staffId) => {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) throw new Error("Order không tồn tại");

  let newStatus;
  if (action === "approve") {
    if (order.status === "pending") newStatus = "confirmed";
    else if (order.status === "confirmed") newStatus = "completed";
    else throw new Error("Không thể duyệt order ở trạng thái hiện tại");
  } else if (action === "reject") {
    if (order.status === "pending") newStatus = "rejected";
    else throw new Error("Chỉ có thể từ chối đơn khi đang pending");
  } else {
    throw new Error("Hành động không hợp lệ");
  }

  const [updated] = await db
    .update(orders)
    .set({ status: newStatus })
    .where(eq(orders.id, orderId))
    .returning();

  return updated;
};
