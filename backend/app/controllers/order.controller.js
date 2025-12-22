import {
  checkoutService,
  updateOrderStatusService,
  getOrderByIdForUserService,
  getOrdersByUserService,
  getOrdersOverviewForStaffService,
  cancelOrderService,
  getOrderWithUserInfoByIdService,
  searchOrdersByIdService,
} from "../services/order.service.js";
import { db } from "../db/client.js";
import { messages } from "../db/schema.js";

export const checkoutController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, couponCode, shipping, paymentMethod, fromCart } = req.body;

    const result = await checkoutService(
      userId,
      items,
      couponCode,
      shipping,
      paymentMethod,
      fromCart
    );

    res.status(201).json({
      message: "Đặt hàng thành công",
      order: result.order,
      orderItems: result.orderItems,
    });
  } catch (error) {
    console.error("Error in checkoutController:", error);
    res.status(400).json({ error: error.message });
  }
};

export const cancelOrderController = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const order = await cancelOrderService(orderId, userId);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Danh sách đơn hàng của customer
export const getMyOrdersController = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await getOrdersByUserService(userId);
    res.json(orders);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Chi tiết đơn hàng của customer
export const getMyOrderByIdController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const order = await getOrderByIdForUserService(id, userId);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getOrdersOverviewForStaffController = async (req, res) => {
  try {
    const orders = await getOrdersOverviewForStaffService();
    res.json(orders);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getOrderWithUserInfoByIdController = async (req, res) => {
  try {
    const order = await getOrderWithUserInfoByIdService(id);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const approveOrderController = async (req, res) => {
  try {
    const id = req.params.id;
    const order = await updateOrderStatusService(id, "approve");
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const rejectOrderController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await updateOrderStatusService(id, "reject");

    if (updatedOrder.groupOrderId && updatedOrder.conversationId && global.io) {
      const conversationId = updatedOrder.conversationId;
      const reason = `Đơn hàng #${id.slice(0, 8)} bị từ chối. Nhóm mua chung đã bị hủy.`;

      const [sysMsg] = await db
        .insert(messages)
        .values({
          conversationId: conversationId,
          content: reason,
          type: "system",
          senderId: "00000000-0000-0000-0000-000000000000",
          createdAt: new Date(),
        })
        .returning();

      global.io.to(conversationId).emit("message", {
        id: sysMsg.id,
        conversationId: conversationId,
        content: sysMsg.content,
        type: sysMsg.type,
        senderId: sysMsg.senderId,
        createdAt: sysMsg.createdAt,
      });

      global.io.to(conversationId).emit("group-status-updated", {
        conversationId: conversationId,
        groupOrderId: updatedOrder.groupOrderId,
        status: "cancelled",
      });

      global.io.to(conversationId).emit("group-order-cancelled", {
        conversationId: conversationId,
        reason: reason,
        message: sysMsg,
      });

      console.log(`[Socket] Group cancelled via Order Reject: ${id}`);
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error("Reject Order Error:", err);
    res.status(400).json({ error: err.message });
  }
};

export const searchOrdersByIdController = async (req, res) => {
  try {
    const { id } = req.query;

    const data = await searchOrdersByIdService(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Search order error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to search orders",
    });
  }
};
