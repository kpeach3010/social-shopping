import { db } from "../db/client.js";
import { orders, orderItems, products, users } from "../db/schema.js";
import {
  and,
  between,
  countDistinct,
  eq,
  gte,
  inArray,
  sql,
} from "drizzle-orm";

// Tính khoảng thời gian filter đơn giản theo range
function resolveDateRange(range) {
  const now = new Date();
  let from = null;

  switch (range) {
    case "7d": {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case "30d": {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    case "all":
    default:
      return { from: null, to: null };
  }

  return { from, to: now };
}

// Các status được tính vào doanh thu
const REVENUE_STATUSES = ["confirmed", "completed"];

export const getStaffDashboardStatsService = async (range = "30d") => {
  const { from, to } = resolveDateRange(range);

  const baseWhereClauses = [inArray(orders.status, REVENUE_STATUSES)];

  if (from && to) {
    baseWhereClauses.push(between(orders.createdAt, from, to));
  }

  const whereRevenue = and(...baseWhereClauses);

  // 1. Tổng quan
  const [summary] = await db
    .select({
      totalRevenue: sql`COALESCE(SUM(${orders.total}), 0)`.mapWith(Number),
      totalOrders: sql`COUNT(*)`.mapWith(Number),
      totalCustomers: countDistinct(orders.userId).mapWith(Number),
    })
    .from(orders)
    .where(whereRevenue);

  const [{ totalProducts }] = await db
    .select({ totalProducts: sql`COUNT(*)`.mapWith(Number) })
    .from(products);

  // 2. Đơn hàng theo trạng thái (không phụ thuộc range)
  const ordersByStatus = await db
    .select({
      status: orders.status,
      count: sql`COUNT(*)`.mapWith(Number),
    })
    .from(orders)
    .groupBy(orders.status);

  // 3. Doanh thu theo ngày theo range ("all" sẽ lấy toàn bộ), tách đơn lẻ vs đơn nhóm
  const revenueByDay = await db
    .select({
      day: sql`DATE(${orders.createdAt})`.as("day"),
      singleRevenue:
        sql`SUM(CASE WHEN ${orders.groupOrderId} IS NULL THEN ${orders.total} ELSE 0 END)`.mapWith(
          Number,
        ),
      groupRevenue:
        sql`SUM(CASE WHEN ${orders.groupOrderId} IS NOT NULL THEN ${orders.total} ELSE 0 END)`.mapWith(
          Number,
        ),
      totalRevenue: sql`SUM(${orders.total})`.mapWith(Number),
    })
    .from(orders)
    .where(whereRevenue)
    .groupBy(sql`DATE(${orders.createdAt})`)
    .orderBy(sql`DATE(${orders.createdAt})`);

  // 4. Top sản phẩm bán chạy trong khoảng range (dựa trên quantity)
  const topProducts = await db
    .select({
      productId: orderItems.productId,
      name: products.name,
      thumbnailUrl: products.thumbnailUrl,
      totalQuantity: sql`SUM(${orderItems.quantity})`.mapWith(Number),
      totalRevenue:
        sql`SUM(${orderItems.quantity} * ${orderItems.price})`.mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(whereRevenue)
    .groupBy(orderItems.productId, products.name, products.thumbnailUrl)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(5);

  return {
    range,
    summary: {
      totalRevenue: summary?.totalRevenue || 0,
      totalOrders: summary?.totalOrders || 0,
      totalCustomers: summary?.totalCustomers || 0,
      totalProducts,
    },
    ordersByStatus,
    revenueByDay,
    topProducts,
  };
};
