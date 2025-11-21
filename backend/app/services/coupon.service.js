import { db } from "../db/client.js";
import {
  coupons,
  couponProducts,
  productVariants,
  orders,
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
  try {
    // kiểm tra trùng code
    const exists = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, data.code))
      .limit(1);

    if (exists.length > 0) {
      throw new Error("Coupon code already exists");
    }

    const kind = normalizeKind(data.kind);
    const type = normalizeType(data.type);

    const payload = {
      code: data.code,
      description: data.description,
      kind,
      type,
      value: data.value,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      used: data.used ?? 0,
      usage_limit: data.usage_limit,
      perUserLimit: data.perUserLimit,
      minOrderTotal: data.minOrderTotal,
      minMember: data.minMember,
      maxMember: data.maxMember ?? 2,
    };

    // Insert coupon
    const [coupon] = await db.insert(coupons).values(payload).returning();

    // Nếu có productIds thì insert vào bảng coupon_products
    if (Array.isArray(data.productIds) && data.productIds.length > 0) {
      const rows = data.productIds.map((pid) => ({
        couponId: coupon.id,
        productId: pid,
      }));

      await db.insert(couponProducts).values(rows);
    }

    return coupon;
  } catch (error) {
    console.error("Error creating coupon:", error);
    throw new Error("Failed to create coupon");
  }
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

  return coupon;
};

// Lấy tất cả coupon còn hiệu lực
export const getValidCouponsService = async (userId = null) => {
  const now = new Date();

  // Lấy coupon còn hạn và chưa hết usage_limit tổng
  const activeCoupons = await db
    .select()
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

    if (onlyApplicable) {
      if (applicable) result.push({ ...c, applicable: true });
    } else {
      result.push({ ...c, applicable });
    }
    return result;
  }, []);
};

// Cập nhật coupon
export const updateCouponService = async (couponId, data) => {
  // Kiểm tra coupon tồn tại
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, couponId))
    .limit(1);

  if (!coupon) {
    throw new Error("Coupon không tồn tại");
  }

  // Chuẩn bị payload update
  const payload = {};
  if (data.description !== undefined) payload.description = data.description;
  if (data.kind !== undefined) payload.kind = data.kind;
  if (data.type !== undefined) payload.type = data.type;
  if (data.value !== undefined) payload.value = data.value;
  if (data.startsAt !== undefined) {
    payload.startsAt =
      data.startsAt instanceof Date ? data.startsAt : new Date(data.startsAt);
  }

  if (data.endsAt !== undefined) {
    payload.endsAt =
      data.endsAt instanceof Date ? data.endsAt : new Date(data.endsAt);
  }
  if (data.usage_limit !== undefined) payload.usage_limit = data.usage_limit;
  if (data.perUserLimit !== undefined) payload.perUserLimit = data.perUserLimit;
  if (data.minOrderTotal !== undefined)
    payload.minOrderTotal = data.minOrderTotal;
  if (data.minMember !== undefined) payload.minMember = data.minMember;

  // Thực hiện update
  const [updated] = await db
    .update(coupons)
    .set(payload)
    .where(eq(coupons.id, couponId))
    .returning();

  return updated;
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
