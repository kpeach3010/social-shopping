import {
  checkoutService,
  updateOrderStatusService,
  getOrderByIdForUserService,
  getOrdersByUserService,
  getOrdersOverviewForStaffService,
  cancelOrderService,
  getOrderWithUserInfoByIdService,
} from "../services/order.service.js";

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
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const rejectOrderController = async (req, res) => {
  try {
    const id = req.params.id;
    const order = await updateOrderStatusService(id, "reject");
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
