import {
  createMomoPaymentRequest,
  verifyMomoSignature,
  createVnpayUrlService,
  verifyVnpayReturnService,
} from "../services/payment.service.js";
import { db } from "../db/client.js";
import { orders } from "../db/schema.js";
import { eq } from "drizzle-orm";

// 1. API TẠO URL
export const createMomoPaymentUrl = async (req, res) => {
  try {
    const { orderId, amount, redirectUrl } = req.body;

    // Gọi Service để xử lý logic MoMo
    const result = await createMomoPaymentRequest(orderId, amount, redirectUrl);

    if (result && result.payUrl) {
      return res.json({ paymentUrl: result.payUrl });
    } else {
      return res
        .status(400)
        .json({ error: "Không tạo được link thanh toán", detail: result });
    }
  } catch (err) {
    console.error("Payment Controller Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 2. API XỬ LÝ KẾT QUẢ (Return/IPN)
export const checkMomoReturn = async (req, res) => {
  try {
    const data = { ...req.query, ...req.body };

    // 1. Gọi Service để kiểm tra chữ ký
    const isValidSignature = verifyMomoSignature(data);

    if (!isValidSignature) {
      return res
        .status(400)
        .json({ code: "97", message: "Chữ ký không hợp lệ" });
    }

    // 2. Xử lý trạng thái đơn hàng
    if (data.resultCode == 0) {
      // Logic Update DB vẫn để ở đây hoặc tách ra order.service.js tùy bạn
      await db
        .update(orders)
        .set({
          paymentMethod: "MOMO",
          updatedAt: new Date(),
          isPaid: true,
          paidAt: new Date(),
        })
        .where(eq(orders.id, data.orderId));

      return res.json({ code: "00", message: "Giao dịch thành công" });
    } else {
      return res.json({ code: data.resultCode, message: "Giao dịch thất bại" });
    }
  } catch (err) {
    console.error("Check Return Error:", err);
    return res.status(500).json({ code: "99", message: "Lỗi hệ thống" });
  }
};

// 1. API TẠO LINK THANH TOÁN
export const createVnpayPaymentUrl = async (req, res) => {
  try {
    const { orderId, amount, redirectUrl } = req.body;

    // Lấy IP của người dùng (Bắt buộc với VNPay)
    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    // Fix lỗi IP localhost dạng ::1
    if (ipAddr === "::1") ipAddr = "127.0.0.1";

    const paymentUrl = createVnpayUrlService({
      orderId,
      amount,
      ipAddr,
      clientReturnUrl: redirectUrl,
    });

    res.json({ paymentUrl });
  } catch (error) {
    console.error("VNPay Create Error:", error);
    res.status(500).json({ error: "Lỗi tạo link thanh toán VNPay" });
  }
};

// 2. API XỬ LÝ KẾT QUẢ TRẢ VỀ
export const vnpayReturn = async (req, res) => {
  try {
    const vnp_Params = req.query;

    // Gọi Service kiểm tra chữ ký
    const { isSuccess, responseCode, orderId } =
      verifyVnpayReturnService(vnp_Params);

    if (!isSuccess) {
      return res.status(400).json({
        code: "97",
        message: "Chữ ký không hợp lệ (Dữ liệu bị thay đổi)",
      });
    }

    // Kiểm tra mã lỗi (00 là thành công)
    if (responseCode === "00") {
      // Cập nhật DB: Đã trả tiền, nhưng vẫn giữ status Pending để nhân viên duyệt
      await db
        .update(orders)
        .set({
          isPaid: true,
          paidAt: new Date(),
          paymentMethod: "VNPAY",
          // status: "pending" (Giữ nguyên)
        })
        .where(eq(orders.id, orderId));

      return res.json({ code: "00", message: "Giao dịch thành công" });
    } else {
      // Thanh toán thất bại
      return res.json({
        code: responseCode,
        message: "Giao dịch thất bại hoặc bị hủy",
      });
    }
  } catch (error) {
    console.error("VNPay Return Error:", error);
    res.status(500).json({ code: "99", message: "Lỗi Server" });
  }
};
