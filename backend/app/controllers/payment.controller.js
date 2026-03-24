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
import { orders, groupOrders, conversations } from "../db/schema.js";
import { eq, and, ne } from "drizzle-orm";
import paypalConfig from "../config/paypal.js";
import { sendOrderStatusNotification } from "../services/orderNotification.service.js";
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
      .select({
        isPaid: orders.isPaid,
        paymentMethod: orders.paymentMethod,
        userId: orders.userId,
        groupOrderId: orders.groupOrderId,
      })
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
        // Capture thành công → cập nhật DB: awaiting_payment → pending
        const [updated] = await db
          .update(orders)
          .set({
            isPaid: true,
            paidAt: new Date(),
            paymentMethod: "PAYPAL",
            status: "pending",
            paypalOrderId: paypalResult.paypalOrderId,
            paypalCaptureId: paypalResult.captureId,
            amountUsd: paypalResult.amountUsd,
            updatedAt: new Date(),
          })
          .where(
            and(eq(orders.id, paypalResult.orderId), eq(orders.isPaid, false)),
          )
          .returning({ id: orders.id });

        // Chỉ gửi notification cá nhân nếu KHÔNG phải đơn nhóm
        // (Đơn nhóm đã được xử lý bởi processGroupOrderPaymentSuccess)
        if (updated && !order.groupOrderId) {
          await sendOrderStatusNotification({
            orderId: paypalResult.orderId,
            userId: order.userId,
            newStatus: "pending",
          });
        }

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
    const { isSuccess, orderId, paypalOrderId, captureId, amountUsd, message } =
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
    // Xử lý tùy theo loại đơn hàng (cá nhân hay nhóm)
    if (String(orderId).startsWith("group_")) {
      const groupOrderId = orderId.replace("group_", "");
      // Đây là đơn nhóm
      await processGroupOrderPaymentSuccess(groupOrderId, captureId, amountUsd);
    } else {
      // Đây là đơn cá nhân
      const [updatedPaypalOrder] = await db
        .update(orders)
        .set({
          isPaid: true,
          paidAt: new Date(),
          paymentMethod: "PAYPAL",
          status: "pending",
          paypalOrderId: paypalOrderId,
          paypalCaptureId: captureId,
          amountUsd: amountUsd,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.isPaid, false)))
        .returning({ userId: orders.userId });

      // Gửi thông báo thanh toán thành công
      if (updatedPaypalOrder?.userId) {
        await sendOrderStatusNotification({
          orderId,
          userId: updatedPaypalOrder.userId,
          newStatus: "pending",
        });
      }
    }

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
      // Logic Update DB: awaiting_payment → pending
      const [updatedMomoOrder] = await db
        .update(orders)
        .set({
          paymentMethod: "MOMO",
          updatedAt: new Date(),
          isPaid: true,
          paidAt: new Date(),
          status: "pending",
        })
        .where(and(eq(orders.id, data.orderId), eq(orders.isPaid, false)))
        .returning({ userId: orders.userId });

      // Gửi thông báo thanh toán thành công
      if (updatedMomoOrder?.userId) {
        await sendOrderStatusNotification({
          orderId: data.orderId,
          userId: updatedMomoOrder.userId,
          newStatus: "pending",
        });
      }

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
      // Cập nhật DB: awaiting_payment → pending để nhân viên duyệt
      const [updatedVnpayOrder] = await db
        .update(orders)
        .set({
          isPaid: true,
          paidAt: new Date(),
          paymentMethod: "VNPAY",
          status: "pending",
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.isPaid, false)))
        .returning({ userId: orders.userId });

      // Gửi thông báo thanh toán thành công
      if (updatedVnpayOrder?.userId) {
        await sendOrderStatusNotification({
          orderId,
          userId: updatedVnpayOrder.userId,
          newStatus: "pending",
        });
      }

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

// GROUP ORDER PAYMENT ENDPOINTS

// 1. API TẠO LINK THANH TOÁN PAYPAL CHO GROUP ORDER
export const createGroupOrderPaypalPayment = async (req, res) => {
  try {
    const { groupOrderId, amount } = req.body;
    const userId = req.user?.id;

    if (!groupOrderId || !amount || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify user is the leader of this group order
    const [groupOrder] = await db
      .select({
        id: groupOrders.id,
        creatorId: groupOrders.creatorId,
        status: groupOrders.status,
      })
      .from(groupOrders)
      .where(eq(groupOrders.id, groupOrderId))
      .limit(1);

    if (!groupOrder) {
      return res.status(404).json({ error: "Group order not found" });
    }

    if (groupOrder.creatorId !== userId) {
      return res
        .status(403)
        .json({ error: "Only group leader can make payment" });
    }

    if (groupOrder.status !== "awaiting_payment") {
      return res
        .status(400)
        .json({ error: "Group order is not awaiting payment" });
    }

    // Create PayPal payment using group order ID as reference
    const result = await createPaypalPaymentUrlService({
      orderId: `group_${groupOrderId}`, // Prefix to differentiate from regular orders
      amount,
      redirectUrl: req.body.redirectUrl || "",
    });

    if (result && result.qrUrl) {
      return res.json({
        qrUrl: result.qrUrl,
        approvalUrl: result.approvalUrl,
        paypalOrderId: result.orderId,
      });
    } else {
      return res
        .status(400)
        .json({ error: "Could not create PayPal payment", detail: result });
    }
  } catch (err) {
    console.error("Group Order PayPal Payment Controller Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 2. API KIỂM TRA TRẠNG THÁI THANH TOÁN GROUP ORDER
export const checkGroupOrderPaymentStatus = async (req, res) => {
  try {
    const { groupOrderId } = req.params;
    const { paypalOrderId } = req.query;
    const userId = req.user?.id;

    // Verify user is the leader
    const [groupOrder] = await db
      .select({
        id: groupOrders.id,
        creatorId: groupOrders.creatorId,
        status: groupOrders.status,
      })
      .from(groupOrders)
      .where(eq(groupOrders.id, groupOrderId))
      .limit(1);

    if (!groupOrder) {
      return res.status(404).json({ error: "Group order not found" });
    }

    if (groupOrder.creatorId !== userId) {
      return res
        .status(403)
        .json({ error: "Only group leader can check payment status" });
    }

    // If already paid (ordering or completed), return success
    if (groupOrder.status === "ordering" || groupOrder.status === "completed") {
      return res.json({ isPaid: true });
    }

    // Check PayPal payment status
    if (paypalOrderId) {
      try {
        const captured = await checkAndCapturePaypalOrder(paypalOrderId);
        console.log(
          `PayPal capture result for group order ${groupOrderId}:`,
          captured,
        );

        if (captured && captured.isPaid === true) {
          // Payment captured successfully
          console.log(
            `PayPal payment COMPLETED for group order ${groupOrderId}`,
          );

          // Check if already processed to avoid double processing
          const [currentGroupOrder] = await db
            .select({ status: groupOrders.status })
            .from(groupOrders)
            .where(eq(groupOrders.id, groupOrderId))
            .limit(1);

          if (
            currentGroupOrder?.status !== "ordering" &&
            currentGroupOrder?.status !== "completed"
          ) {
            // Process payment success - wrap in try-catch to ensure we return isPaid even if processing fails
            try {
              await processGroupOrderPaymentSuccess(
                groupOrderId,
                captured.captureId,
                captured.amountUsd,
              );
              console.log(
                `Group order ${groupOrderId} payment processing completed successfully`,
              );
            } catch (processingError) {
              console.error(
                `Error processing group order ${groupOrderId} payment success:`,
                processingError,
              );
              // Continue to return isPaid: true since PayPal payment was successful
            }
          } else {
            console.log(
              `Group order ${groupOrderId} already processed (status: ${currentGroupOrder?.status}), skipping processing`,
            );
          }

          return res.json({ isPaid: true });
        } else {
          console.log(
            `PayPal payment for group order ${groupOrderId} not yet completed. Captured:`,
            captured,
          );
        }
      } catch (paypalError) {
        console.warn("PayPal capture error:", paypalError);
      }
    }

    return res.json({ isPaid: false });
  } catch (err) {
    console.error("Check Group Order Payment Status Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Helper function to process successful group order payment
async function processGroupOrderPaymentSuccess(
  groupOrderId,
  captureId,
  amountUsd,
) {
  try {
    console.log(
      `Starting payment success processing for group order ${groupOrderId} with captureId ${captureId}`,
    );

    // Get group order to find the creatorId
    const [group] = await db
      .select({ creatorId: groupOrders.creatorId })
      .from(groupOrders)
      .where(eq(groupOrders.id, groupOrderId))
      .limit(1);

    if (!group) throw new Error("Group order not found");

    // Get all orders for this group order (all statuses)
    const groupOrderOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.groupOrderId, groupOrderId));

    console.log(
      `Found ${groupOrderOrders.length} orders for group order ${groupOrderId}`,
    );

    // Update only unpaid, active orders (not cancelled/rejected history)
    const updatedUserIds = new Set();
    for (const order of groupOrderOrders) {
      if (order.status === "cancelled" || order.status === "rejected") continue;

      const isCreator =
        order.userId &&
        group.creatorId &&
        String(order.userId).toLowerCase() === String(group.creatorId).toLowerCase();

      const updateData = {
        status: "pending",
        isPaid: true,
        paidAt: new Date(),
        updatedAt: new Date(),
      };

      if (isCreator) {
        updateData.paypalCaptureId = captureId;
        updateData.amountUsd = amountUsd;
      }

      const [updated] = await db
        .update(orders)
        .set(updateData)
        .where(and(eq(orders.id, order.id), eq(orders.isPaid, false)))
        .returning({ id: orders.id });

      console.log(
        `Updated order ${order.id} result: ${updated ? "SUCCESS" : "SKIPPED (Already Paid)"} (isCreator: ${isCreator})`,
      );

      if (updated) {
        updatedUserIds.add(String(order.userId));
      }
    }

    // Send exactly 1 consolidated group notification per unique member
    if (updatedUserIds.size > 0) {
      try {
        const { createNotificationService } = await import(
          "../services/notification.service.js"
        );

        // Lấy thumbnail sản phẩm từ group order
        const [groupProduct] = await db
          .select({ thumbnailUrl: groupOrders.productId })
          .from(groupOrders)
          .where(eq(groupOrders.id, groupOrderId))
          .limit(1);

        // Lấy thumbnail thực sự
        const { products } = await import("../db/schema.js");
        const [productInfo] = await db
          .select({ thumbnailUrl: products.thumbnailUrl })
          .from(products)
          .innerJoin(groupOrders, eq(groupOrders.productId, products.id))
          .where(eq(groupOrders.id, groupOrderId))
          .limit(1);

        // Lấy tên nhóm
        const [conv] = await db
          .select({ name: conversations.name })
          .from(conversations)
          .where(eq(conversations.groupOrderId, groupOrderId))
          .limit(1);

        const groupName = conv?.name || "Nhóm mua chung";
        const thumbnailUrl = productInfo?.thumbnailUrl || null;
        const creatorId = String(group.creatorId);

        for (const uid of updatedUserIds) {
          const isCreator = uid.toLowerCase() === creatorId.toLowerCase();
          const content = isCreator
            ? `Bạn đã thanh toán thành công cho đơn nhóm "${groupName}". Đơn hàng đang chờ shop xác nhận.`
            : `Trưởng nhóm đã thanh toán thành công cho đơn nhóm "${groupName}". Đơn hàng đang chờ shop xác nhận.`;

          try {
            const notification = await createNotificationService({
              userId: uid,
              type: "group_order_paid",
              title: "Thanh toán nhóm thành công",
              content,
              imageUrl: thumbnailUrl,
              actionUrl: "/profile?tab=orders&status=pending",
            });

            if (global.io) {
              global.io.to(uid).emit("notification:new", { notification });
            }
          } catch (notifError) {
            console.warn(`Failed to send group notification to user ${uid}:`, notifError);
          }
        }
      } catch (notifError) {
        console.warn("Failed to send group payment notifications:", notifError);
      }
    }

    // Update group order status to ordering (payment completed, orders ready for processing)
    const [updatedGroup] = await db
      .update(groupOrders)
      .set({ status: "ordering", updatedAt: new Date() })
      .where(
        and(
          eq(groupOrders.id, groupOrderId),
          ne(groupOrders.status, "ordering"),
          ne(groupOrders.status, "completed"),
        ),
      )
      .returning({ id: groupOrders.id });

    if (!updatedGroup) {
      console.log(
        `Group order ${groupOrderId} already processed (status was already ordering or completed), skipping notification/system message.`,
      );
      return;
    }

    console.log(`Updated group order ${groupOrderId} to ordering status`);

    // Get conversationId to emit socket
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    const conversationId = conv?.id;
    console.log(
      `Found conversation ${conversationId} for group order ${groupOrderId}`,
    );

    // Emit socket event to update UI
    if (global.io && conversationId) {
      global.io.to(conversationId).emit("group-status-updated", {
        conversationId,
        groupOrderId,
        status: "ordering",
        paymentMethod: "PAYPAL",
      });

      console.log(
        `Emitted group-status-updated for conversation ${conversationId}`,
      );

      // Send system message
      try {
        const { createSystemMessage } = await import(
          "../services/message.service.js"
        );
        const content =
          "Thanh toán nhóm hoàn tất! Đơn hàng đã được gửi đến shop.";
        const sysMsg = await createSystemMessage(conversationId, content);

        global.io.to(conversationId).emit("message", {
          id: sysMsg.id,
          conversationId,
          content,
          type: "system",
          senderId: "00000000-0000-0000-0000-000000000000",
          senderFullName: "Hệ thống",
          createdAt: sysMsg.createdAt,
        });

        console.log(`Sent system message for conversation ${conversationId}`);
      } catch (err) {
        console.error("Error sending system message:", err);
      }
    } else {
      console.warn(
        `Cannot emit socket - global.io: ${!!global.io}, conversationId: ${conversationId}`,
      );
    }

    console.log(`Group order ${groupOrderId} payment processed successfully`);
  } catch (error) {
    console.error("Error processing group order payment success:", error);
    throw error;
  }
}
