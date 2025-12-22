import * as MomoService from "../services/payment.service.js";
import { db } from "../db/client.js";
import { orders } from "../db/schema.js";
import { eq } from "drizzle-orm";

// 1. API TẠO URL
export const createMomoPaymentUrl = async (req, res) => {
  try {
    const { orderId, amount, redirectUrl } = req.body;

    // Gọi Service để xử lý logic MoMo
    const result = await MomoService.createMomoPaymentRequest(
      orderId,
      amount,
      redirectUrl
    );

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
    const isValidSignature = MomoService.verifyMomoSignature(data);

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
