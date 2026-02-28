export const groupOrderStatusEnum = Object.freeze({
  PENDING: "pending", // cho du nguoi
  LOCKED: "locked", // da du nguoi, giai doan chon qty và variant
  ORDERING: "ordering", // truong nhom bam dat don
  AWAITING_PAYMENT: "awaiting_payment", // cho truong nhom thanh toan (30 phut)
  COMPLETED: "completed", // don hang hoan thanh
  CANCELLED: "cancelled", // nhom bị huy hoac het han coupon ma chua du so luong thanh vien
});
