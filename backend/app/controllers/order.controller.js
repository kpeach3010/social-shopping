import {
  checkoutService,
  updateOrderStatusService,
  getOrderByIdForUserService,
  getOrdersByUserService,
  getOrdersOverviewForStaffService,
  cancelOrderService,
  getOrderWithUserInfoByIdService,
  searchOrdersByIdService,
  changeMyOrderPaymentMethodToCodService,
} from "../services/order.service.js";
import { db } from "../db/client.js";
import { conversations, messages, orders, products, groupOrders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createSystemMessage } from "../services/message.service.js";
import { createNotificationService } from "../services/notification.service.js";

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
      fromCart,
    );

    // Bắn socket thông báo cá nhân
    if (!result.order.groupOrderId) {
      try {
        const notification = await createNotificationService({
          userId,
          type: "order_placed",
          title: "Đặt hàng thành công",
          content: `Đơn hàng cá nhân #${result.order.id.slice(0, 8)} đã được đặt. Cảm ơn bạn đã mua hàng!`,
          imageUrl: result.orderItems.length > 0 ? result.orderItems[0].imageUrl : null,
          actionUrl: `/profile?tab=orders&status=${result.initialStatus}`,
        });
        if (global.io) {
          global.io.to(String(userId)).emit("notification:new", { notification });
        }
      } catch (err) {
        console.error("Lỗi gửi thông báo đặt hàng cá nhân:", err);
      }
    }

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

// Customer hủy đơn hàng cá nhân
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

// Customer đổi phương thức thanh toán đơn lẻ từ online -> COD
export const changeMyOrderPaymentMethodToCodController = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const updated = await changeMyOrderPaymentMethodToCodService(
      orderId,
      userId,
    );

    res.json(updated);
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
    const { id } = req.params;
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

    // Nếu là đơn thuộc nhóm thì không cho hủy nhóm nữa
    if (order.groupOrderId && global.io) {
      try {
        const [conv] = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(eq(conversations.groupOrderId, order.groupOrderId))
          .limit(1);

        const conversationId = conv?.id;
        if (conversationId) {
          global.io.to(conversationId).emit("group-can-cancel-updated", {
            conversationId,
            groupOrderId: order.groupOrderId,
            canCancelGroupOrder: false,
          });
        }
      } catch (e) {
        console.error(
          "Lỗi emit group-can-cancel-updated trong approveOrderController:",
          e,
        );
      }
    }
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// STAFF: xác nhận tất cả đơn trong một groupOrder
export const approveGroupOrdersController = async (req, res) => {
  try {
    const { groupOrderId } = req.params;

    if (!groupOrderId) {
      return res.status(400).json({ error: "Thiếu groupOrderId" });
    }

    // Lấy tất cả đơn thuộc nhóm
    const groupOrdersList = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.groupOrderId, groupOrderId));

    if (groupOrdersList.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy đơn nào trong nhóm này" });
    }

    // Chỉ xử lý các đơn đang pending
    const pendingOrders = groupOrdersList.filter((o) => o.status === "pending");

    const updatedOrders = [];
    for (const o of pendingOrders) {
      const updated = await updateOrderStatusService(o.id, "approve");
      updatedOrders.push(updated);
    }

    // Tạo system message cho nhóm
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    const conversationId = conv?.id;

    if (conversationId) {
      try {
        const content =
          "Nhân viên đã xác nhận đơn nhóm. Đơn hàng của mọi thành viên sẽ được xử lý.";
        const sysMsg = await createSystemMessage(conversationId, content);

        if (global.io) {
          global.io.to(conversationId).emit("message", {
            id: sysMsg.id,
            conversationId,
            content,
            type: "system",
            senderId: "00000000-0000-0000-0000-000000000000",
            createdAt: sysMsg.createdAt,
          });

          // Sau khi nhân viên duyệt đơn nhóm, không còn cho phép trưởng nhóm hủy
          global.io.to(conversationId).emit("group-can-cancel-updated", {
            conversationId,
            groupOrderId,
            canCancelGroupOrder: false,
          });
        }
      } catch (e) {
        console.error(
          "Lỗi tạo system message khi xác nhận đơn nhóm (approveGroupOrdersController):",
          e,
        );
      }
    }

    return res.json({ success: true, updatedOrders });
  } catch (err) {
    console.error("Approve group orders error:", err);
    return res.status(400).json({ error: err.message });
  }
};

export const rejectOrderController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await updateOrderStatusService(id, "reject");

    if (updatedOrder.groupOrderId && updatedOrder.conversationId && global.io) {
      const conversationId = updatedOrder.conversationId;
      const reason = `Đơn hàng nhóm bị từ chối. Nhóm mua chung đã bị hủy`;
      // Dùng createSystemMessage để đồng bộ cả bảng conversations (lastMessage + lastMessageAt)
      const sysMsg = await createSystemMessage(conversationId, reason);

      global.io.to(conversationId).emit("message", {
        id: sysMsg.id,
        conversationId: conversationId,
        content: reason,
        type: "system",
        senderId: "00000000-0000-0000-0000-000000000000",
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
      
      // Gửi thông báo từ chối cho tất cả user trong nhóm (Tách ra từ service)
      const [conv] = await db
        .select({ name: conversations.name })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
        
      const groupName = conv?.name || "Nhóm mua chung";

      // Lấy product thumbnail từ group order
      const [groupP] = await db
        .select({ thumbnailUrl: products.thumbnailUrl })
        .from(groupOrders)
        .innerJoin(products, eq(groupOrders.productId, products.id))
        .where(eq(groupOrders.id, updatedOrder.groupOrderId));

      const groupOrdersList = await db
        .select({ id: orders.id, userId: orders.userId })
        .from(orders)
        .where(eq(orders.groupOrderId, updatedOrder.groupOrderId));

      for (const go of groupOrdersList) {
        try {
           const notification = await createNotificationService({
             userId: go.userId,
             type: "group_order_cancelled",
             title: "Đơn nhóm bị từ chối",
             content: `Đơn hàng của "${groupName}" đã bị nhân viên từ chối.`,
             imageUrl: groupP?.thumbnailUrl || null,
             actionUrl: `/profile?tab=orders&status=rejected`,
           });
           if (global.io) {
             global.io.to(String(go.userId)).emit("notification:new", { notification });
           }
        } catch(err) {
           console.error("Lỗi gửi thông báo từ chối đơn nhóm:", err);
        }
      }
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
