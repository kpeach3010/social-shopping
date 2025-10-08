const groupOrderStatusEnum = Object.freeze({
  PENDING: "pending", // cho du nguoi
  LOCKED: "lockeed", // da du nguoi, giai doan chon qty và variant
  ORDERING: "ordering", // truong nhom bam dat don
  COMPLETED: "completed", // don hang hoan thanh
  CANCELLED: "cancelled", // nhom bị huy hoac het ham coupon ma chua du so luong thanh vien
});
module.exports = groupOrderStatusEnum;
