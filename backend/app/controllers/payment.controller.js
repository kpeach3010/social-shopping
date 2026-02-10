import {
  createMomoPaymentRequest,
  verifyMomoSignature,
  createVnpayUrlService,
  verifyVnpayReturnService,
  createPaypalPaymentUrlService,
  verifyPaypalReturnService,
  checkAndCapturePaypalOrder,
} from "../services/payment.service.js";
import { db } from "../db/client.js";
import { orders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import paypalConfig from "../config/paypal.js";
// 1. API TẠO LINK THANH TOÁN PAYPAL
export const createPaypalPaymentUrl = async (req, res) => {
  try {
    const { orderId, amount, redirectUrl } = req.body;
    // Gọi service tạo link PayPal
    const result = await createPaypalPaymentUrlService({
      orderId,
      amount,
      redirectUrl,
    });
    if (result && result.qrUrl) {
      return res.json({
        qrUrl: result.qrUrl,
        approvalUrl: result.approvalUrl,
        paypalOrderId: result.orderId, // Trả PayPal order ID cho FE dùng polling
      });
    } else {
      return res
        .status(400)
        .json({ error: "Không tạo được link PayPal", detail: result });
    }
  } catch (err) {
    console.error("PayPal Payment Controller Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 2. API KIỂM TRA TRẠNG THÁI ĐƠN PAYPAL (cho polling từ FE khi quét QR)
// Nếu DB chưa paid → kiểm tra PayPal API, nếu user đã approve → auto-capture → cập nhật DB
export const checkPaypalOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paypalOrderId } = req.query; // PayPal order ID từ FE

    // 1. Kiểm tra DB trước
    const [order] = await db
      .select({ isPaid: orders.isPaid, paymentMethod: orders.paymentMethod })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Đơn hàng không tồn tại" });
    }

    // Đã paid rồi → trả luôn
    if (order.isPaid) {
      return res.json({ isPaid: true, paymentMethod: order.paymentMethod });
    }

    // 2. Chưa paid + có paypalOrderId → kiểm tra PayPal API & auto-capture
    if (paypalOrderId) {
      const paypalResult = await checkAndCapturePaypalOrder(paypalOrderId);

      if (paypalResult.isPaid && paypalResult.orderId) {
        // Capture thành công → cập nhật DB
        await db
          .update(orders)
          .set({
            isPaid: true,
            paidAt: new Date(),
            paymentMethod: "PAYPAL",
          })
          .where(eq(orders.id, paypalResult.orderId));

        return res.json({ isPaid: true, paymentMethod: "PAYPAL" });
      }
    }

    // 3. Chưa thanh toán
    return res.json({ isPaid: false, paymentMethod: order.paymentMethod });
  } catch (error) {
    console.error("Check PayPal Status Error:", error);
    res.status(500).json({ error: "Lỗi Server" });
  }
};

// 3. API XỬ LÝ KẾT QUẢ TRẢ VỀ PAYPAL (phone browser redirect về đây)
export const paypalReturn = async (req, res) => {
  try {
    const params = req.query;
    // Gọi service xác thực return
    const { isSuccess, orderId, message } =
      await verifyPaypalReturnService(params);
    if (!isSuccess) {
      // Trả HTML cho phone browser
      return res.send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Thanh toán thất bại</title>
        <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fef2f2}
        .card{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 12px rgba(0,0,0,.1)}
        .icon{font-size:3rem;margin-bottom:1rem}h2{color:#dc2626}</style></head>
        <body><div class="card"><div class="icon">❌</div><h2>Thanh toán thất bại</h2>
        <p>${message || "Giao dịch bị hủy hoặc không hợp lệ"}</p>
        <p style="color:#666;margin-top:1rem">Bạn có thể đóng trang này.</p></div></body></html>
      `);
    }
    // Cập nhật DB: Đã trả tiền, giữ status Pending để nhân viên duyệt
    await db
      .update(orders)
      .set({
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: "PAYPAL",
      })
      .where(eq(orders.id, orderId));

    // Trả HTML thành công cho phone browser
    return res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Thanh toán thành công</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0fdf4}
      .card{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 12px rgba(0,0,0,.1)}
      .icon{font-size:3rem;margin-bottom:1rem}h2{color:#16a34a}</style></head>
      <body><div class="card"><div class="icon">✅</div><h2>Thanh toán thành công!</h2>
      <p>Đơn hàng của bạn đã được thanh toán qua PayPal.</p>
      <p style="color:#666;margin-top:1rem">Bạn có thể đóng trang này và quay lại máy tính.</p></div></body></html>
    `);
  } catch (error) {
    console.error("PayPal Return Error:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Lỗi</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fef2f2}
      .card{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 12px rgba(0,0,0,.1)}
      .icon{font-size:3rem;margin-bottom:1rem}h2{color:#dc2626}</style></head>
      <body><div class="card"><div class="icon">⚠️</div><h2>Có lỗi xảy ra</h2>
      <p>Vui lòng quay lại trang web trên máy tính.</p></div></body></html>
    `);
  }
};

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
