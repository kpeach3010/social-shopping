export const momoConfig = {
  partnerCode: "MOMO", // Mã đối tác test
  accessKey: "F8BBA842ECF85", // Access Key test
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz", // Secret Key test
  endpoint: "https://test-payment.momo.vn/v2/gateway/api/create",
  // URL nhận thông báo từ MoMo (Server gọi Server) - BẮT BUỘC PUBLIC INTERNET
  ipnUrl: "https://social-shopping-api.onrender.com/api/payment/momo/return",

  // URL chuyển hướng người dùng sau khi thanh toán xong
  redirectUrl: "https://social-shopping-app.vercel.app/payment/momo-return",
};
