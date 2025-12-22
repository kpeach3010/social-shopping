export const vnpayConfig = {
  tmnCode: "G3EFF7JI", // Thay bằng mã trong email bạn nhận được
  hashSecret: "349QZWOCKEADH4TSMWN0VRUETYHWK4RO", // Thay bằng mã trong email
  url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  ipnUrl: "https://social-shopping-api.onrender.com/api/payment/vnpay/return",

  // URL chuyển hướng người dùng sau khi thanh toán xong
  returnUrl: "https://social-shopping-app.vercel.app/payment/vnpay-return",
};
