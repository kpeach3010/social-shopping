import {
  getGroupOrderDetailService,
  chooseVariantService,
  groupOrderCheckoutService,
} from "../services/groupOrders.service.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export const getGroupOrderDetailController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const groupOrderDetail = await getGroupOrderDetailService(
      userId,
      conversationId
    );
    res.json(groupOrderDetail);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const chooseVariantController = async (req, res) => {
  try {
    const { groupOrderId } = req.params;
    const { variantId, quantity } = req.body;
    const userId = req.user.id;
    console.log(">>> groupOrderId:", req.params.groupOrderId);
    console.log(">>> userId:", req.user.id);

    const result = await chooseVariantService({
      groupOrderId,
      userId,
      variantId,
      quantity,
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const groupOrderCheckoutController = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const groupOrderId = req.params.id;

    const result = await groupOrderCheckoutService(creatorId, groupOrderId);

    res.status(200).json({
      message: "Đặt đơn nhóm thành công",
      data: result,
    });
  } catch (err) {
    console.error("❌ groupOrderCheckoutController:", err);
    res.status(400).json({
      error: err.message || "Lỗi khi đặt đơn nhóm",
    });
  }
};
