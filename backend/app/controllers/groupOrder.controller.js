import {
  getGroupOrderDetailService,
  // chooseVariantService,
  groupOrderCheckoutService,
  leaveGroupOrderService,
  selectItemsService,
  leaveConversationAfterDoneService,
} from "../services/groupOrders.service.js";

import { createSystemMessage } from "../services/message.service.js";
import { db } from "../db/client.js";
import { users, conversations, groupOrders } from "../db/schema.js";
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

export const leaveGroupController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { groupOrderId } = req.params;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

    // Lấy trạng thái nhóm
    const [group] = await db
      .select({ status: groupOrders.status })
      .from(groupOrders)
      .where(eq(groupOrders.id, groupOrderId))
      .limit(1);

    if (!group) return res.status(404).json({ error: "Nhóm không tồn tại" });

    let result;

    if (group.status === "pending") {
      result = await leaveGroupOrderService({ userId, groupOrderId });
    } else if (group.status === "completed") {
      result = await leaveConversationAfterDoneService({
        userId,
        groupOrderId,
      });
    } else {
      return res
        .status(400)
        .json({ error: "Không thể rời nhóm ở trạng thái hiện tại." });
    }

    // --- [SỬA 1]: Đổi 'deleted' thành 'isDisbanded' cho đúng với Service ---
    const { conversationId, message, isDisbanded } = result;

    if (!conversationId) {
      return res
        .status(400)
        .json({ error: "Không tìm thấy conversation của nhóm." });
    }

    // --- [SỬA 2 - QUAN TRỌNG]: Kick TẤT CẢ socket của user ra khỏi phòng ---
    try {
      const sockets = await global.io.in(conversationId).fetchSockets();

      // Duyệt qua tất cả socket trong phòng này
      for (const socket of sockets) {
        // Nếu socket này thuộc về userId đang rời
        if (
          String(socket.data?.userId || socket.handshake?.query?.userId) ===
          String(userId)
        ) {
          socket.leave(conversationId); // Kick ngay
          // console.log(`Đã kick socket ${socket.id} của user ${userId} ra khỏi phòng`);
        }
      }
    } catch (e) {
      console.error("Lỗi khi kick socket:", e);
    }
    // -----------------------------------------------------------------------

    // 4. Tạo system message
    const sysMsg = await createSystemMessage(conversationId, message);

    // 5. Emit realtime
    if (global.io) {
      // Vì đã kick user ra rồi, nên dòng này chỉ người CÒN LẠI mới nhận được
      // -> Chatbox của người rời sẽ KHÔNG tự bật lên nữa
      global.io.to(conversationId).emit("message", {
        id: sysMsg.id,
        type: "system",
        conversationId,
        content: message,
        senderId: "00000000-0000-0000-0000-000000000000",
        createdAt: sysMsg.createdAt,
      });

      // Emit event user-left cho người còn lại reload danh sách
      global.io.to(conversationId).emit("user-left", {
        conversationId,
        userId,
        message,
      });

      // Bắt buộc đóng chat phía client (Lớp bảo vệ thứ 2)
      global.io.to(userId).emit("force-close-chat", {
        conversationId,
      });

      // Nếu nhóm bị xoá
      if (isDisbanded) {
        global.io.to(conversationId).emit("group-deleted", {
          conversationId,
          message: result.message,
        });
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi leaveGroup:", err);
    return res.status(400).json({ error: err.message });
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
