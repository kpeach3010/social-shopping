export const orderStatus = Object.freeze({
  AWAITING_PAYMENT: "awaiting_payment", // Chờ thanh toán
  PENDING: "pending", // Chờ nhân viên xác nhận
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});
