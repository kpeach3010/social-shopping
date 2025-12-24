import {
  sendFriendRequestService,
  acceptFriendRequestService,
  rejectFriendRequestService,
  cancelFriendRequestService,
  removeFriendService,
  getFriendsService,
  getPendingFriendRequestsService,
  checkFriendshipStatusService,
  getFriendCountService,
} from "../services/friend.service.js";

// Gửi lời mời kết bạn
export const sendFriendRequestController = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId là bắt buộc",
      });
    }

    const result = await sendFriendRequestService(senderId, receiverId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequestController = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId là bắt buộc",
      });
    }

    const result = await acceptFriendRequestService(requestId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Accept friend request error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Từ chối lời mời kết bạn
export const rejectFriendRequestController = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId là bắt buộc",
      });
    }

    const result = await rejectFriendRequestService(requestId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Reject friend request error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Hủy lời mời kết bạn (người gửi hủy)
export const cancelFriendRequestController = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId là bắt buộc",
      });
    }

    const result = await cancelFriendRequestService(requestId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Cancel friend request error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Hủy bạn bè
export const removeFriendController = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: "friendId là bắt buộc",
      });
    }

    const result = await removeFriendService(userId, friendId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Remove friend error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy danh sách bạn bè
export const getFriendsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const friends = await getFriendsService(userId);

    res.status(200).json({
      success: true,
      data: friends,
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy danh sách lời mời kết bạn chưa xử lý
export const getPendingFriendRequestsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await getPendingFriendRequestsService(userId);

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Get pending friend requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Kiểm tra tình trạng bạn bè
export const checkFriendshipStatusController = async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.user.id;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "targetId là bắt buộc",
      });
    }

    const status = await checkFriendshipStatusService(userId, targetId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Check friendship status error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Đếm số bạn bè của một user
export const getFriendCountController = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId là bắt buộc",
      });
    }

    const count = await getFriendCountService(userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("Get friend count error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
