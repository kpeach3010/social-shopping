import {
  getGroupOrderDetailService,
  // chooseVariantService,
  groupOrderCheckoutService,
  leaveGroupOrderService,
  selectItemsService,
} from "../services/groupOrders.service.js";

import { createSystemMessage } from "../services/message.service.js";
import { db } from "../db/client.js";
import { users, conversations } from "../db/schema.js";
import { eq } from "drizzle-orm";

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

// export const chooseVariantController = async (req, res) => {
//   try {
//     const { groupOrderId } = req.params;
//     const { variantId, quantity } = req.body;
//     const userId = req.user.id;

//     // 1. Gọi service để cập nhật lựa chọn
//     const result = await chooseVariantService({
//       groupOrderId,
//       userId,
//       variantId,
//       quantity,
//     });

//     const isUpdate = result.data.isUpdate;

//     console.log("chooseVariantController result:", result);

//     // 2. Lấy thông tin user (để hiển thị tên trong hệ thống)
//     const [u] = await db
//       .select({ fullName: users.fullName })
//       .from(users)
//       .where(eq(users.id, userId))
//       .limit(1);

//     const fullName = u?.fullName || "Người dùng";

//     // 3. Tìm conversation theo groupOrderId
//     const [conv] = await db
//       .select({ id: conversations.id })
//       .from(conversations)
//       .where(eq(conversations.groupOrderId, groupOrderId))
//       .limit(1);

//     if (!conv) {
//       console.error(
//         "Không tìm thấy conversation tương ứng groupOrderId:",
//         groupOrderId
//       );
//     }

//     const conversationId = conv?.id;

//     // 4. Tạo SYSTEM MESSAGE vào DB
//     const content = isUpdate
//       ? `${fullName} đã cập nhật lựa chọn (${quantity} sản phẩm)`
//       : `${fullName} đã chọn ${quantity} sản phẩm`;

//     // Lưu vào DB như message hệ thống
//     const sysMsg = await createSystemMessage(conversationId, content);

//     if (global.io && conversationId) {
//       global.io.to(conversationId).emit("message", {
//         id: sysMsg.id,
//         conversationId,
//         content,
//         type: "system",
//         senderId: "00000000-0000-0000-0000-000000000000",
//         createdAt: sysMsg.createdAt,
//       });
//     }
//     // 5. Emit socket realtime
//     if (global.io && conversationId) {
//       global.io.to(conversationId).emit("group-order-choice", {
//         userId,
//         fullName,
//         quantity,
//         conversationId,
//         createdAt: new Date().toISOString(),
//       });
//     }

//     return res.status(200).json(result);
//   } catch (err) {
//     console.error("ERROR chooseVariantController:", err);
//     return res.status(400).json({ error: err.message, stack: err.stack });
//   }
// };

export const groupOrderCheckoutController = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const groupOrderId = req.params.id;

    const result = await groupOrderCheckoutService(creatorId, groupOrderId);

    console.log("checkout result:", result);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    if (!conv) {
      console.warn("Không tìm thấy conversation cho group order");
    } else {
      const conversationId = conv.id;
      const content = `Trưởng nhóm đã đặt đơn nhóm.`;

      const msg = await createSystemMessage(conversationId, content);

      if (global.io) {
        global.io.to(conversationId).emit("message", {
          id: msg.id,
          conversationId,
          content,
          type: "system",
          senderId: "00000000-0000-0000-0000-000000000000",
          createdAt: msg.createdAt,
        });
      }
    }

    return res.status(200).json({
      message: "Đặt đơn nhóm thành công",
      data: result,
    });
  } catch (err) {
    console.error("groupOrderCheckoutController:", err);
    return res.status(400).json({ error: err.message });
  }
};

export const leaveGroupOrderController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupOrderId } = req.params;

    const result = await leaveGroupOrderService({ userId, groupOrderId });

    if (global.io && result.conversationId) {
      // luôn gửi thông báo rời nhóm
      global.io.to(result.conversationId).emit("user-left", {
        conversationId: result.conversationId,
        message: result.message,
      });

      // nếu có người kế nhiệm, gửi thêm sự kiện leader-changed riêng
      if (result.newLeader) {
        global.io.to(result.conversationId).emit("leader-changed", {
          conversationId: result.conversationId,
          newLeader: result.newLeader,
        });
      }

      // nếu nhóm bị giải tán
      if (result.deleted) {
        global.io.to(result.conversationId).emit("group-deleted", {
          conversationId: result.conversationId,
          message: result.message,
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi leaveGroupOrder:", error);
    res.status(400).json({ error: error.message });
  }
};

export const selectItemsController = async (req, res) => {
  try {
    const groupOrderId = req.params.groupOrderId;
    const userId = req.user.id;
    const items = req.body.items;

    // 1) Gọi service xử lý chọn sản phẩm
    const result = await selectItemsService({
      groupOrderId,
      userId,
      items,
    });

    // 2) Lấy thông tin user
    const [u] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const fullName = u?.fullName || "Người dùng";

    // 3) Lấy conversation bằng groupOrderId
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    const conversationId = conv?.id;

    if (!conversationId) {
      console.warn("Không tìm thấy conversation cho groupOrder:", groupOrderId);
      return res.json(result);
    }

    // 4) Tạo nội dung system message
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

    const { isUpdate } = result;

    let content;
    if (isUpdate) {
      content = `${fullName} đã cập nhật lựa chọn (${totalQty} sản phẩm).`;
    } else {
      content = `${fullName} đã chọn ${totalQty} sản phẩm.`;
    }

    // 5) Lưu system message vào DB
    const sysMsg = await createSystemMessage(conversationId, content);

    // 6) Emit realtime cho toàn bộ thành viên trong nhóm
    if (global.io) {
      // Emit message system vào khung chat
      global.io.to(conversationId).emit("message", {
        id: sysMsg.id,
        conversationId,
        content,
        type: "system",
        senderId: "00000000-0000-0000-0000-000000000000",
        createdAt: sysMsg.createdAt,
      });

      // Emit thông tin chọn sản phẩm
      global.io.to(conversationId).emit("group-order-choice", {
        userId,
        fullName,
        items,
        isUpdate,
        totalQty,
        conversationId,
        createdAt: new Date().toISOString(),
      });
    }

    // 7) Trả response
    return res.json({
      ...result,
      message: "Chọn sản phẩm thành công",
    });
  } catch (err) {
    console.error("ERROR selectItemsController:", err);
    res.status(400).json({ error: true, message: err.message });
  }
};
