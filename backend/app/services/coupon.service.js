import { db } from "../db/client.js";
import {
  coupons,
  couponProducts,
  productVariants,
  orders,
  products,
} from "../db/schema.js";
import { eq, lte, gte, isNull, lt, and, or, inArray, sql } from "drizzle-orm";
import { GroupKind } from "../enums/kind.enum.js";
import { CouponType } from "../enums/type.enum.js";

// Chuẩn hóa kind (chỉ cho phép 'general' hoặc 'group')
function normalizeKind(value) {
  if (!value) return GroupKind.GENERAL; // default
  const v = String(value).toLowerCase();
  if (Object.values(GroupKind).includes(v)) return v;
  throw new Error("Invalid coupon kind. Must be 'general' or 'group'");
}

// Chuẩn hóa type (chỉ cho phép 'percent' hoặc 'fixed')
function normalizeType(value) {
  if (!value) return CouponType.FIXED; // default
  const v = String(value).toLowerCase();
  if (Object.values(CouponType).includes(v)) return v;
  throw new Error("Invalid coupon type. Must be 'percent' or 'fixed'");
}

// tao 1 coupon
export const createCouponService = async (data) => {
  // Dùng transaction để đảm bảo cả Coupon và Product Links cùng thành công hoặc cùng thất bại
  return await db.transaction(async (tx) => {
    // 1. Kiểm tra trùng mã Code (Kiểm tra ngay trong transaction để tránh Race Condition)
    const [existing] = await tx
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, data.code))
      .limit(1);

    if (existing) {
      throw new Error("Mã giảm giá này đã tồn tại. Vui lòng chọn mã khác.");
    }

    // 2. Chuẩn bị dữ liệu để insert vào bảng coupons
    const payload = {
      code: data.code,
      description: data.description || "",
      kind: data.kind || "general",
      type: data.type || "fixed",
      value: data.value, // Drizzle sẽ tự handle string -> decimal
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      usage_limit: data.usage_limit || null,
      perUserLimit: data.perUserLimit || null,
      minOrderTotal: data.minOrderTotal || 0,
      maxMember: data.maxMember || 2, // Mặc định nhóm 2 người
      used: 0, // Khởi tạo số lần dùng là 0
    };

    // 3. Tạo Coupon
    const [newCoupon] = await tx.insert(coupons).values(payload).returning();

    // 4. Xử lý danh sách sản phẩm (Logic: Chọn gì lưu nấy, không chọn = Tất cả)
    if (Array.isArray(data.productIds) && data.productIds.length > 0) {
      // Quan trọng: Lọc trùng ID để tránh lỗi Unique Constraint của DB
      // Ví dụ FE gửi: ['id1', 'id1'] -> Set chuyển thành {'id1'} -> Array ['id1']
      const uniqueProductIds = [...new Set(data.productIds)];

      const productRelations = uniqueProductIds.map((pid) => ({
        couponId: newCoupon.id,
        productId: pid,
      }));

      // Insert batch (nhiều dòng cùng lúc)
      await tx.insert(couponProducts).values(productRelations);
    }

    // Nếu data.productIds = [] hoặc null -> Không insert vào bảng couponProducts
    // => Logic hệ thống sẽ hiểu là áp dụng cho TOÀN BỘ sản phẩm.

    return newCoupon;
  });
};

export const getAllCouponsService = async () => {
  try {
    const allCoupons = await db.select().from(coupons);
    return allCoupons;
  } catch (error) {
    console.error("Error fetching coupons:", error);
    throw new Error("Failed to fetch coupons");
  }
};

export const getCouponByIdService = async (id) => {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);

  if (!coupon) {
    throw new Error("Coupon không tồn tại");
  }

  const productList = await db
    .select({
      id: products.id,
      name: products.name,
      thumbnailUrl: products.thumbnailUrl,
      price: products.price_default,
    })
    .from(couponProducts)
    .innerJoin(products, eq(couponProducts.productId, products.id))
    .where(eq(couponProducts.couponId, id));

  return {
    ...coupon,
    products: productList,
  };
};

// Lấy tất cả coupon còn hiệu lực
export const getValidCouponsService = async (userId = null) => {
  const now = new Date();
  // Chỉ lấy các trường cần thiết
  const activeCoupons = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      description: coupons.description,
      kind: coupons.kind,
      type: coupons.type,
      value: coupons.value,
      startsAt: coupons.startsAt,
      endsAt: coupons.endsAt,
      usage_limit: coupons.usage_limit,
      used: coupons.used,
      perUserLimit: coupons.perUserLimit,
      minOrderTotal: coupons.minOrderTotal,
      maxMember: coupons.maxMember,
    })
    .from(coupons)
    .where(
      and(
        lte(coupons.startsAt, now),
        gte(coupons.endsAt, now),
        or(isNull(coupons.usage_limit), lt(coupons.used, coupons.usage_limit))
      )
    );

  if (!userId) return activeCoupons;

  // Nếu có userId → lọc theo perUserLimit
  const result = [];
  for (const c of activeCoupons) {
    let userUsedCount = 0;

    if (userId) {
      const [{ count }] = await db
        .select({ count: sql`COUNT(*)`.mapWith(Number) })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.couponCode, c.code)));

      userUsedCount = count;

      if (c.perUserLimit && userUsedCount >= c.perUserLimit) {
        continue; // user dùng đủ -> bỏ
      }
    }

    result.push({
      ...c,
      userUsedCount, // ← thêm ở đây
    });
  }
  return result;
};

export const getAvailableCouponsForProductsService = async ({
  productIds = [],
  variantIds = [],
  userId = null, // thêm userId để lọc theo perUserLimit
  onlyApplicable = false,
} = {}) => {
  const allProductIds = [
    ...productIds,
    ...(variantIds.length
      ? (
          await db
            .select({ productId: productVariants.productId })
            .from(productVariants)
            .where(inArray(productVariants.id, variantIds))
        ).map((r) => r.productId)
      : []),
  ];
  const uniqueProductIds = [...new Set(allProductIds)];
  if (!uniqueProductIds.length) return [];

  // lấy coupon hợp lệ (đã lọc theo user nếu có userId)
  const allCoupons = await getValidCouponsService(userId);
  if (!allCoupons.length) return [];

  // Prefetch mapping coupon->product
  const couponIds = allCoupons.map((c) => c.id);
  const mappings = await db
    .select({
      couponId: couponProducts.couponId,
      productId: couponProducts.productId,
    })
    .from(couponProducts)
    .where(inArray(couponProducts.couponId, couponIds));

  const map = mappings.reduce((acc, m) => {
    if (!acc.has(m.couponId)) acc.set(m.couponId, new Set());
    acc.get(m.couponId).add(m.productId);
    return acc;
  }, new Map());

  return allCoupons.reduce((result, c) => {
    const allowedSet = map.get(c.id);
    const applicable = !allowedSet
      ? true
      : uniqueProductIds.every((pid) => allowedSet.has(pid));

    // Chỉ trả về các trường cần thiết cho FE
    const couponData = {
      id: c.id,
      code: c.code,
      description: c.description,
      kind: c.kind,
      type: c.type,
      value: c.value,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      usage_limit: c.usage_limit,
      used: c.used,
      perUserLimit: c.perUserLimit,
      minOrderTotal: c.minOrderTotal,
      maxMember: c.maxMember,
      applicable,
    };
    if (onlyApplicable) {
      if (applicable) result.push(couponData);
    } else {
      result.push(couponData);
    }
    return result;
  }, []);
};

// Cập nhật coupon
export const updateCouponService = async (couponId, data) => {
  // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
  return await db.transaction(async (tx) => {
    // 1. Kiểm tra coupon tồn tại
    const [existingCoupon] = await tx
      .select()
      .from(coupons)
      .where(eq(coupons.id, couponId))
      .limit(1);

    if (!existingCoupon) {
      throw new Error("Coupon không tồn tại");
    }

    // 2. Chuẩn bị payload update cho bảng coupons
    const payload = {};

    // Chỉ update các trường có gửi lên (undefined check)
    if (data.code !== undefined) payload.code = data.code;
    if (data.description !== undefined) payload.description = data.description;
    if (data.kind !== undefined) payload.kind = data.kind;
    if (data.type !== undefined) payload.type = data.type;
    if (data.value !== undefined) payload.value = data.value;

    // Xử lý Date
    if (data.startsAt !== undefined) {
      payload.startsAt =
        data.startsAt instanceof Date ? data.startsAt : new Date(data.startsAt);
    }
    if (data.endsAt !== undefined) {
      payload.endsAt =
        data.endsAt instanceof Date ? data.endsAt : new Date(data.endsAt);
    }

    // Validation ngày tháng (Optional nhưng nên có)
    if (
      payload.startsAt &&
      payload.endsAt &&
      payload.startsAt > payload.endsAt
    ) {
      throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc");
    } else if (
      payload.startsAt &&
      !payload.endsAt &&
      payload.startsAt > existingCoupon.endsAt
    ) {
      throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc hiện tại");
    } else if (
      !payload.startsAt &&
      payload.endsAt &&
      existingCoupon.startsAt > payload.endsAt
    ) {
      throw new Error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu hiện tại");
    }

    if (data.usage_limit !== undefined) payload.usage_limit = data.usage_limit;
    if (data.perUserLimit !== undefined)
      payload.perUserLimit = data.perUserLimit;
    if (data.minOrderTotal !== undefined)
      payload.minOrderTotal = data.minOrderTotal;

    // FIX: Schema là maxMember, code cũ là minMember
    if (data.maxMember !== undefined) payload.maxMember = data.maxMember;

    // Luôn update thời gian cập nhật (nếu schema có cột updatedAt thì nên thêm logic trigger hoặc set ở đây)
    // payload.updatedAt = new Date();

    // 3. Thực hiện update bảng coupons nếu có dữ liệu thay đổi
    let updatedCoupon = existingCoupon;
    if (Object.keys(payload).length > 0) {
      const [result] = await tx
        .update(coupons)
        .set(payload)
        .where(eq(coupons.id, couponId))
        .returning();
      updatedCoupon = result;
    }

    // 4. Xử lý cập nhật danh sách sản phẩm (couponProducts)
    // FE gửi lên productIds: string[] | undefined
    if (Array.isArray(data.productIds)) {
      // Bước 4.1: Xóa tất cả liên kết cũ của coupon này
      await tx
        .delete(couponProducts)
        .where(eq(couponProducts.couponId, couponId));

      // Bước 4.2: Thêm liên kết mới (nếu mảng không rỗng)
      if (data.productIds.length > 0) {
        const productRelations = data.productIds.map((productId) => ({
          couponId: couponId,
          productId: productId,
        }));

        await tx.insert(couponProducts).values(productRelations);
      }
    }

    // 5. Trả về kết quả (có thể query lại để lấy full cả products nếu cần)
    return updatedCoupon;
  });
};

// xóa 1 hoặc nhiều coupon cùng lúc
export const deleteCouponService = async (ids) => {
  if (!Array.isArray(ids)) ids = [ids];
  if (!ids.length) throw new Error("No coupon id(s) provided");
  // Xóa mapping trong coupon_products trước
  await db.delete(couponProducts).where(inArray(couponProducts.couponId, ids));
  // Xóa coupon
  const result = await db
    .delete(coupons)
    .where(inArray(coupons.id, ids))
    .returning();
  return { deletedCount: result.length };
};
