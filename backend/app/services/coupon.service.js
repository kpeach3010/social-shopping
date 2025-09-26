import { db } from "../db/client.js";
import { coupons, couponProducts } from "../db/schema.js";
import { eq, lte, gte, isNull, lt, and, or } from "drizzle-orm";
import GroupKind from "../enums/kind.enum.js";
import CouponType from "../enums/type.enum.js";

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
    // kiem tra trung name
    const exists = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, data.code))
      .limit(1);

    if (exists.length > 0) {
      throw new Error("coupon name already exists");
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
      used: data.used,
      usage_limit: data.usage_limit,
      perUserLimit: data.perUserLimit,
      stackable: data.stackable ?? false,
      minOrderTotal: data.minOrderTotal,
      minMember: data.minMember,
      minTotalQuantity: data.minTotalQuantity,
      requireSameVariant: data.requireSameVariant ?? false,
    };

    const [coupon] = await db.insert(coupons).values(payload).returning();
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

// Lấy tất cả coupon còn hiệu lực
export const getValidCouponsService = async () => {
  const now = new Date();

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

  return activeCoupons;
};

// Lấy coupon hợp lệ cho sản phẩm đã chọn
export const getAvailableCouponsForProductsService = async (productIds) => {
  if (!Array.isArray(productIds) || productIds.length === 0) return [];

  // gọi hàm tái sử dụng
  const allCoupons = await getValidCouponsService();

  const result = [];
  for (const c of allCoupons) {
    const appliedProducts = await db
      .select({ productId: couponProducts.productId })
      .from(couponProducts)
      .where(eq(couponProducts.couponId, c.id));

    if (appliedProducts.length === 0) {
      // coupon áp dụng cho toàn bộ sản phẩm
      result.push({ ...c, applicable: true });
    } else {
      const allowedProductIds = appliedProducts.map((p) => p.productId);
      const hasMatch = productIds.some((pid) =>
        allowedProductIds.includes(pid)
      );
      result.push({ ...c, applicable: hasMatch });
    }
  }

  return result;
};

export const deleteCouponService = async (couponId) => {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, couponId))
    .limit(1);

  if (!coupon) {
    throw new Error("Coupon không tồn tại");
  }

  await db.delete(coupons).where(eq(coupons.id, couponId));

  return { message: "Xóa coupon thành công", couponId };
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
  // if (data.stackable !== undefined) payload.stackable = data.stackable;
  if (data.minOrderTotal !== undefined)
    payload.minOrderTotal = data.minOrderTotal;
  if (data.minMember !== undefined) payload.minMember = data.minMember;
  if (data.minTotalQuantity !== undefined)
    payload.minTotalQuantity = data.minTotalQuantity;

  // Thực hiện update
  const [updated] = await db
    .update(coupons)
    .set(payload)
    .where(eq(coupons.id, couponId))
    .returning();

  return updated;
};
