import {
  getGroupOrderDetailService,
  // chooseVariantService,
  groupOrderCheckoutService,
  leaveGroupOrderService,
  selectItemsService,
  leaveConversationAfterDoneService,
  cancelGroupOrderAfterCheckoutService,
  changeGroupOrderProductService,
  changeGroupOrderPaymentMethodService,
  disbandGroupOrderService,
} from "../services/groupOrders.service.js";

import { createSystemMessage } from "../services/message.service.js";
import { formatVND } from "../services/order.service.js";
import { createNotificationService } from "../services/notification.service.js";
import { db } from "../db/client.js";
import {
  users,
  conversations,
  groupOrders,
  messages,
  productVariants,
  colors,
  sizes,
  products,
  groupOrderMembers
} from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";

export const getGroupOrderDetailController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const groupOrderDetail = await getGroupOrderDetailService(
      userId,
      conversationId,
    );
    res.json(groupOrderDetail);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const groupOrderCheckoutController = async (req, res) => {
  try {
    // 1. Lấy ID an toàn (Check cả groupOrderId và id đề phòng route đặt tên khác)
    const groupOrderId = req.params.groupOrderId || req.params.id;
    const { paymentMethod = "COD" } = req.body; // Lấy paymentMethod từ body
    const userId = req.user?.id;

    if (!groupOrderId) {
      return res.status(400).json({ error: "Thiếu ID nhóm (groupOrderId)" });
    }

    // 2. Gọi Service xử lý DB (Update status, tạo đơn hàng)
    const result = await groupOrderCheckoutService(
      userId,
      groupOrderId,
      paymentMethod,
    );

    // 3. Lấy conversationId để bắn Socket
    // (Vì service không trả về conversationId nên ta query nhẹ ở đây)
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    const conversationId = conv?.id;

    // 4. Bắn Socket thông báo cho mọi người
    if (global.io && conversationId) {
      // a. Cập nhật trạng thái UI (Lock -> Ordering hoặc Awaiting Payment)
      global.io.to(conversationId).emit("group-status-updated", {
        conversationId,
        groupOrderId,
        status: result.status, // "ordering" hoặc "awaiting_payment"
        paymentMethod: result.paymentMethod,
      });

      // b. Gửi tin nhắn hệ thống vào khung chat
      try {
        const content =
          paymentMethod === "COD"
            ? "Trưởng nhóm đã đặt đơn."
            : "Trưởng nhóm đã khởi tạo đơn hàng, đang chờ thanh toán trong 30 phút.";
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

        // Gửi thông báo cho mọi người trong nhóm 
        const [convInfo] = await db
          .select({ name: conversations.name })
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);

        const groupName = convInfo?.name || "Nhóm mua chung";

        const [groupOrderInfo] = await db
          .select({ productId: groupOrders.productId })
          .from(groupOrders)
          .where(eq(groupOrders.id, groupOrderId))
          .limit(1);

        const [productInfo] = await db
          .select({ thumbnailUrl: products.thumbnailUrl })
          .from(products)
          .where(eq(products.id, groupOrderInfo?.productId));

        for (const createdOrder of result.orders) {
          try {
             const isCreator = String(createdOrder.userId) === String(userId);
             const notification = await createNotificationService({
               userId: createdOrder.userId,
               type: "group_order_placed",
               title: "Đặt đơn nhóm thành công",
               content: isCreator
                 ? `Đơn hàng của "${groupName}" đã được bạn (trưởng nhóm) đặt thành công. Cảm ơn bạn đã mua hàng!`
                 : `Đơn hàng của "${groupName}" đã được trưởng nhóm đặt thành công. Cảm ơn bạn đã mua hàng!`,
               imageUrl: productInfo?.thumbnailUrl || null,
               actionUrl: `/profile?tab=orders&status=${result.status}`,
             });
             global.io.to(String(createdOrder.userId)).emit("notification:new", { notification });
          } catch(err) {
             console.error("Lỗi gửi thông báo đặt đơn nhóm:", err);
          }
        }
      } catch (err) {
        console.error("Lỗi gửi tin nhắn system khi checkout:", err);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi checkout:", error);
    return res.status(400).json({ error: error.message });
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
    } else if (group.status === "completed" || group.status === "cancelled") {
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

      for (const socket of sockets) {
        // Lấy userId từ tất cả các nguồn có thể (auth, query, data)
        const socketUserId =
          socket.handshake.auth?.userId || // <--- THÊM CÁI NÀY
          socket.handshake.query?.userId ||
          socket.data?.userId;

        // So sánh
        if (String(socketUserId) === String(userId)) {
          socket.leave(conversationId); // Kick thực sự
          console.log(
            `Kick socket ${socket.id} của user ${userId} ra khỏi phòng ${conversationId}`,
          );
        }
      }
    } catch (e) {
      console.error("Lỗi khi kick socket:", e);
    }
    // -----------------------------------------------------------------------

    if (isDisbanded) {
      // TRƯỜNG HỢP 1: Nhóm đã giải tán (Đã xóa khỏi DB)
      // -> KHÔNG ĐƯỢC gọi createSystemMessage (vì sẽ lỗi FK)

      if (global.io) {
        // Gửi thông báo giải tán cho những người (nếu còn sót lại) đang mở chat
        global.io.to(conversationId).emit("group-deleted", {
          conversationId,
          message: result.message || "Nhóm đã giải tán.",
        });

        // Gửi riêng cho người vừa rời để đóng chat
        global.io.to(userId).emit("force-close-chat", { conversationId });
      }
    } else {
      // TRƯỜNG HỢP 2: Nhóm vẫn còn (chỉ là người rời đi)
      // -> Lưu tin nhắn hệ thống vào DB bình thường

      const sysMsg = await createSystemMessage(conversationId, message);

      if (global.io) {
        global.io.to(conversationId).emit("message", {
          id: sysMsg.id,
          type: "system",
          conversationId,
          content: message,
          senderId: "00000000-0000-0000-0000-000000000000",
          createdAt: sysMsg.createdAt,
        });

        global.io.to(conversationId).emit("user-left", {
          conversationId,
          userId,
          message,
        });

        global.io.to(userId).emit("force-close-chat", { conversationId });
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

      // Use the enriched items returned directly from the service
      const enrichedItems = result.items;

      // Emit thông tin chọn sản phẩm
      global.io.to(conversationId).emit("group-order-choice", {
        userId,
        fullName,
        items: enrichedItems,
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

export const cancelGroupOrderController = async (req, res) => {
  try {
    const { id } = req.params; //  groupOrderId
    const userId = req.user.id;

    // Gọi Service
    const result = await cancelGroupOrderAfterCheckoutService(id, userId);

    // Xử lý Socket nếu thành công
    if (result.success && result.conversationId && global.io) {
      const conversationId = result.conversationId;
      const reason =
        "Trưởng nhóm đã hủy đơn đặt hàng nhóm. Trưởng nhóm có thể giải tán nhóm hoặc thay đổi sản phẩm mua chung.";

      // 1. Lưu tin nhắn hệ thống
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

      // 2. Emit tin nhắn vào khung chat
      global.io.to(conversationId).emit("message", {
        id: sysMsg.id,
        conversationId: conversationId,
        content: sysMsg.content,
        type: sysMsg.type,
        senderId: sysMsg.senderId,
        createdAt: sysMsg.createdAt,
      });

      // 3. Emit cập nhật trạng thái nhóm (Ordering -> locked)
      global.io.to(conversationId).emit("group-status-updated", {
        conversationId: conversationId,
        groupOrderId: id,
        status: "locked",
      });

      // 4. Emit Popup thông báo
      global.io.to(conversationId).emit("group-order-cancelled", {
        conversationId: conversationId,
        reason: reason,
        message: sysMsg,
      });

      console.log(`[Socket] Group ${id} cancelled by Creator`);
      
      // --- GUI THONG BAO HUY DON NHOM BOI TRUONG NHOM ---
      try {
        const [productInfo] = await db
          .select({ thumbnailUrl: products.thumbnailUrl })
          .from(products)
          .where(eq(products.id, result.productId));
    
        const members = await db
          .select({ userId: groupOrderMembers.userId })
          .from(groupOrderMembers)
          .where(eq(groupOrderMembers.groupOrderId, id));
          
          for (const member of members) {
            const isCreator = 
              member.userId && 
              userId && 
              String(member.userId).toLowerCase() === String(userId).toLowerCase();
              
            let ntfContent = isCreator
              ? `Đơn hàng nhóm "${result.groupName}" đã bị bạn hủy.`
              : `Đơn hàng nhóm "${result.groupName}" đã bị trưởng nhóm hủy.`;

            if (isCreator && result.refundSuccess) {
              ntfContent += ` Đã hoàn tiền ${formatVND(result.refundAmount)} vào tài khoản PayPal của bạn.`;
            }

            const notification = await createNotificationService({
              userId: member.userId,
              type: "group_order_cancelled",
              title: "Đơn nhóm bị hủy",
              content: ntfContent,
              imageUrl: productInfo?.thumbnailUrl || null,
              actionUrl: `/profile?tab=orders&status=cancelled`,
            });
            if (global.io) {
              global.io.to(String(member.userId)).emit("notification:new", {
                notification,
              });
            }
          }
      } catch (err) {
        console.error("Lỗi gửi thông báo hủy group order:", err);
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Cancel Group Error:", err);
    res.status(400).json({ error: err.message });
  }
};

// Đổi sản phẩm mua chung (chỉ trưởng nhóm, trạng thái pending/locked)
export const changeGroupOrderProductController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const groupOrderId = req.params.groupOrderId || req.params.id;
    const { newProductId } = req.body;

    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });
    if (!groupOrderId || !newProductId) {
      return res
        .status(400)
        .json({ error: "Thiếu groupOrderId hoặc newProductId" });
    }

    // 1. Gọi service đổi sản phẩm
    const result = await changeGroupOrderProductService({
      userId,
      groupOrderId,
      newProductId,
    });

    // 2. Lấy conversationId để gửi socket và lưu message
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);
    const conversationId = conv?.id;

    // 3. Lưu system message
    let sysMsg = null;
    const content =
      "Trưởng nhóm đã đổi sản phẩm mua chung. Vui lòng chọn lại biến thể.";
    if (conversationId) {
      sysMsg = await createSystemMessage(conversationId, content);
    }

    // 4. Emit socket event cho FE
    if (global.io && conversationId) {
      global.io.to(conversationId).emit("group-order-product-changed", {
        conversationId,
        groupOrderId,
        newProductId,
        message: content,
      });
      // Emit luôn system message vào khung chat
      if (sysMsg) {
        global.io.to(conversationId).emit("message", {
          id: sysMsg.id,
          conversationId,
          content,
          type: "system",
          senderId: "00000000-0000-0000-0000-000000000000",
          createdAt: sysMsg.createdAt,
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Lỗi đổi sản phẩm groupOrder:", err);
    return res.status(400).json({ error: err.message });
  }
};

// Đổi phương thức thanh toán nhóm (từ online -> COD) khi đang awaiting_payment
export const changeGroupOrderPaymentMethodController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const groupOrderId = req.params.groupOrderId || req.params.id;
    const { paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Chưa đăng nhập" });
    }

    if (!groupOrderId || !paymentMethod) {
      return res
        .status(400)
        .json({ error: "Thiếu groupOrderId hoặc paymentMethod" });
    }

    const result = await changeGroupOrderPaymentMethodService({
      userId,
      groupOrderId,
      newPaymentMethod: paymentMethod,
    });

    // Lấy conversationId để bắn socket
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.groupOrderId, groupOrderId))
      .limit(1);

    const conversationId = conv?.id;

    const content = "Trưởng nhóm đã đổi phương thức thanh toán sang COD";

    let sysMsg = null;
    if (conversationId) {
      sysMsg = await createSystemMessage(conversationId, content);
    }

    if (global.io && conversationId) {
      // Cập nhật trạng thái nhóm trên FE
      global.io.to(conversationId).emit("group-status-updated", {
        conversationId,
        groupOrderId,
        status: result.status,
        paymentMethod: result.paymentMethod,
      });

      // Gửi system message vào khung chat
      if (sysMsg) {
        global.io.to(conversationId).emit("message", {
          id: sysMsg.id,
          conversationId,
          content,
          type: "system",
          senderId: "00000000-0000-0000-0000-000000000000",
          createdAt: sysMsg.createdAt,
        });
      }
    }

    return res.json(result);
  } catch (err) {
    console.error("Lỗi đổi phương thức thanh toán groupOrder:", err);
    return res.status(400).json({ error: err.message });
  }
};

// Trưởng nhóm giải tán nhóm (Disband)
export const disbandGroupOrderController = async (req, res) => {
  try {
    const { id } = req.params; // groupOrderId
    const userId = req.user.id;

    const result = await disbandGroupOrderService(id, userId);

    const { mode, conversationId, groupName, oldStatus } = result;

    if (global.io && conversationId) {
      if (mode === "deleted") {
        // TRƯỜNG HỢP 1: Nhóm đã giải tán (Đã xóa khỏi DB)
        
        // Báo cho mọi người trong phòng là nhóm đã giải tán
        global.io.to(conversationId).emit("group-deleted", {
          conversationId,
          message: `Nhóm "${groupName}" đã bị giải tán bởi Trưởng nhóm.`,
        });

        // Ép đóng chatbox ngay lập tức
        global.io.to(conversationId).emit("force-close-chat", { conversationId });

        // Kick sockets
        try {
          const sockets = await global.io.in(conversationId).fetchSockets();
          for (const socket of sockets) {
            socket.leave(conversationId);
          }
        } catch (e) {
          console.error("Lỗi kick socket:", e);
        }

      } else if (mode === "archived") {
        // TRƯỜNG HỢP 2: Nhóm bị lưu trữ (completed/cancelled)
        
        // Tắt chatbox cho mọi người ngay lập tức (bao gồm trưởng nhóm)
        global.io.to(conversationId).emit("force-close-chat", { conversationId });
      }

      // --- Gửi Notification hàng loạt cho các thành viên (bao gồm cả trưởng nhóm) ---
      try {
        const { allMemberIds, imageUrl, groupName: gName } = result;
        if (allMemberIds && allMemberIds.length > 0) {
          for (const memberId of allMemberIds) {
            const isCreator = String(memberId) === String(userId);
            let ntfContent = "";
            if (oldStatus === "completed") {
              ntfContent = isCreator
                ? `Bạn (trưởng nhóm) đã giải tán nhóm "${gName}" khi nhóm hoàn thành.`
                : "Do nhóm đã hoàn thành nên trưởng nhóm đã giải tán nhóm.";
            } else {
              ntfContent = isCreator
                ? `Nhóm "${gName}" đã bị bạn (trưởng nhóm) giải tán`
                : `Nhóm "${gName}" đã bị giải tán bởi Trưởng nhóm`;
            }

            const notification = await createNotificationService({
              userId: memberId,
              type: "group_disbanded",
              title: "Nhóm mua chung bị giải tán",
              content: ntfContent,
              imageUrl: imageUrl,
              link: null,
            });

            if (global.io) {
              global.io.to(String(memberId)).emit("notification:new", { notification });
            }
          }
        }
      } catch (ntfErr) {
        console.error("Lỗi gửi thông báo giải tán nhóm:", ntfErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Đã giải tán nhóm thành công.",
      mode,
    });

  } catch (err) {
    console.error("Lỗi giải tán nhóm:", err);
    return res.status(400).json({ error: err.message });
  }
};
