import { db } from "../db/client.js";
import { friendRequests, friendships, users } from "../db/schema.js";
import { eq, and, or, desc, sql } from "drizzle-orm";

// Gửi lời mời kết bạn
export const sendFriendRequestService = async (senderId, receiverId) => {
  try {
    // 1) Kiểm tra senderId và receiverId hợp lệ
    if (senderId === receiverId) {
      throw new Error("Không thể gửi lời mời cho chính mình");
    }

    const receiver = await db
      .select()
      .from(users)
      .where(eq(users.id, receiverId));

    if (!receiver.length) {
      throw new Error("Người dùng không tồn tại");
    }

    // 2) Kiểm tra xem đã là bạn bè chưa
    const existingFriendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, senderId),
          eq(friendships.friendId, receiverId)
        )
      );

    if (existingFriendship.length) {
      throw new Error("Đã là bạn bè với người này rồi");
    }

    // 3) Kiểm tra xem đã gửi lời mời PENDING chưa (không chặn các request đã accepted/rejected)
    const existingPendingRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, senderId),
          eq(friendRequests.receiverId, receiverId),
          eq(friendRequests.status, "pending")
        )
      );

    if (existingPendingRequest.length) {
      throw new Error("Đã gửi lời mời kết bạn cho người này rồi");
    }

    // 4) Kiểm tra xem có lời mời từ phía đó không
    const reverseRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, receiverId),
          eq(friendRequests.receiverId, senderId),
          eq(friendRequests.status, "pending")
        )
      );

    if (reverseRequest.length) {
      throw new Error("Người này đã gửi lời mời kết bạn cho bạn");
    }

    // 5) Tạo lời mời kết bạn
    const [newRequest] = await db
      .insert(friendRequests)
      .values({
        senderId,
        receiverId,
        status: "pending",
      })
      .returning();

    return {
      id: newRequest.id,
      senderId: newRequest.senderId,
      receiverId: newRequest.receiverId,
      status: newRequest.status,
      createdAt: newRequest.createdAt,
    };
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequestService = async (requestId, userId) => {
  try {
    // 1) Kiểm tra lời mời tồn tại
    const request = await db
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, requestId));

    if (!request.length) {
      throw new Error("Lời mời kết bạn không tồn tại");
    }

    // 2) Kiểm tra xem userId có phải người nhận không
    if (request[0].receiverId !== userId) {
      throw new Error("Không có quyền chấp nhận lời mời này");
    }

    if (request[0].status !== "pending") {
      throw new Error("Lời mời này không ở trạng thái chờ xử lý");
    }

    // 3) Cập nhật trạng thái lời mời thành accepted
    await db
      .update(friendRequests)
      .set({
        status: "accepted",
        respondedAt: new Date(),
      })
      .where(eq(friendRequests.id, requestId));

    // 4) Tạo relationship bạn bè (2 chiều)
    await db.insert(friendships).values([
      {
        userId: request[0].senderId,
        friendId: request[0].receiverId,
      },
      {
        userId: request[0].receiverId,
        friendId: request[0].senderId,
      },
    ]);

    return {
      success: true,
      message: "Chấp nhận lời mời kết bạn thành công",
      request: {
        id: request[0].id,
        senderId: request[0].senderId,
        receiverId: request[0].receiverId,
        status: "accepted",
      },
    };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

// Từ chối lời mời kết bạn
export const rejectFriendRequestService = async (requestId, userId) => {
  try {
    // 1) Kiểm tra lời mời tồn tại
    const request = await db
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, requestId));

    if (!request.length) {
      throw new Error("Lời mời kết bạn không tồn tại");
    }

    // 2) Kiểm tra xem userId có phải người nhận không
    if (request[0].receiverId !== userId) {
      throw new Error("Không có quyền từ chối lời mời này");
    }

    if (request[0].status !== "pending") {
      throw new Error("Lời mời này không ở trạng thái chờ xử lý");
    }

    // 3) Xóa lời mời kết bạn
    await db.delete(friendRequests).where(eq(friendRequests.id, requestId));

    return {
      success: true,
      message: "Từ chối lời mời kết bạn thành công",
    };
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    throw error;
  }
};

// Hủy lời mời kết bạn (người gửi hủy lời mời của mình)
export const cancelFriendRequestService = async (requestId, userId) => {
  try {
    // 1) Kiểm tra lời mời tồn tại
    const request = await db
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, requestId));

    if (!request.length) {
      throw new Error("Lời mời kết bạn không tồn tại");
    }

    // 2) Kiểm tra xem userId có phải người gửi không
    if (request[0].senderId !== userId) {
      throw new Error("Không có quyền hủy lời mời này");
    }

    if (request[0].status !== "pending") {
      throw new Error("Chỉ có thể hủy lời mời đang chờ xử lý");
    }

    // 3) Xóa lời mời
    await db.delete(friendRequests).where(eq(friendRequests.id, requestId));

    return {
      success: true,
      message: "Hủy lời mời kết bạn thành công",
    };
  } catch (error) {
    console.error("Error canceling friend request:", error);
    throw error;
  }
};

// Hủy bạn bè
export const removeFriendService = async (userId, friendId) => {
  try {
    // 1) Kiểm tra không phải hủy chính mình
    if (userId === friendId) {
      throw new Error("Không thể hủy kết bạn với chính mình");
    }

    // 2) Kiểm tra xem đã là bạn bè không
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.userId, userId), eq(friendships.friendId, friendId))
      );

    if (!friendship.length) {
      throw new Error("Không phải bạn bè");
    }

    // 3) Xóa cả 2 chiều
    await db
      .delete(friendships)
      .where(
        or(
          and(
            eq(friendships.userId, userId),
            eq(friendships.friendId, friendId)
          ),
          and(
            eq(friendships.userId, friendId),
            eq(friendships.friendId, userId)
          )
        )
      );

    // 4) Xóa các friend_requests giữa 2 người (mọi trạng thái)
    await db
      .delete(friendRequests)
      .where(
        or(
          and(
            eq(friendRequests.senderId, userId),
            eq(friendRequests.receiverId, friendId)
          ),
          and(
            eq(friendRequests.senderId, friendId),
            eq(friendRequests.receiverId, userId)
          )
        )
      );

    return {
      success: true,
      message: "Hủy kết bạn thành công và đã dọn dữ liệu lời mời",
    };
  } catch (error) {
    console.error("Error removing friend:", error);
    throw error;
  }
};

// Lấy danh sách bạn bè
export const getFriendsService = async (userId) => {
  try {
    const friends = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
      })
      .from(friendships)
      .leftJoin(users, eq(friendships.friendId, users.id))
      .where(eq(friendships.userId, userId));

    return friends.filter((f) => f.id !== null);
  } catch (error) {
    console.error("Error getting friends:", error);
    throw error;
  }
};

// Lấy danh sách lời mời kết bạn chưa xử lý
export const getPendingFriendRequestsService = async (userId) => {
  try {
    const requests = await db
      .select({
        id: friendRequests.id,
        requestId: friendRequests.id,
        senderId: friendRequests.senderId,
        senderName: users.fullName,
        senderEmail: users.email,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.senderId, users.id))
      .where(
        and(
          eq(friendRequests.receiverId, userId),
          eq(friendRequests.status, "pending")
        )
      )
      .orderBy(desc(friendRequests.createdAt));

    return requests;
  } catch (error) {
    console.error("Error getting pending friend requests:", error);
    throw error;
  }
};

// Đếm số bạn bè
export const getFriendCountService = async (userId) => {
  try {
    const [result] = await db
      .select({ count: sql`COUNT(*)` })
      .from(friendships)
      .where(eq(friendships.userId, userId));

    return Number(result?.count ?? 0);
  } catch (error) {
    console.error("Error getting friend count:", error);
    throw error;
  }
};

// Kiểm tra tình trạng bạn bè
export const checkFriendshipStatusService = async (userId, targetId) => {
  try {
    // 1) Kiểm tra đã là bạn bè chưa
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.userId, userId), eq(friendships.friendId, targetId))
      );

    if (friendship.length) {
      return {
        status: "friends",
        message: "Đã là bạn bè",
      };
    }

    // 2) Kiểm tra có lời mời chờ xử lý từ userId gửi không
    const sentRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, userId),
          eq(friendRequests.receiverId, targetId),
          eq(friendRequests.status, "pending")
        )
      );

    if (sentRequest.length) {
      return {
        status: "request_sent",
        requestId: sentRequest[0].id,
        message: "Đã gửi lời mời kết bạn",
      };
    }

    // 3) Kiểm tra có lời mời từ targetId gửi không
    const receivedRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, targetId),
          eq(friendRequests.receiverId, userId),
          eq(friendRequests.status, "pending")
        )
      );

    if (receivedRequest.length) {
      return {
        status: "request_received",
        requestId: receivedRequest[0].id,
        message: "Có lời mời kết bạn từ người này",
      };
    }

    return {
      status: "not_friends",
      message: "Chưa kết bạn",
    };
  } catch (error) {
    console.error("Error checking friendship status:", error);
    throw error;
  }
};
