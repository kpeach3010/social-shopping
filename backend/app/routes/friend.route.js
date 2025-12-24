import { Router } from "express";
import * as FriendController from "../controllers/friend.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Tất cả endpoints cần authenticate
router.use(authenticate);

// Gửi lời mời kết bạn
router.post("/request", FriendController.sendFriendRequestController);

// Chấp nhận lời mời kết bạn
router.patch(
  "/request/:requestId/accept",
  FriendController.acceptFriendRequestController
);

// Từ chối lời mời kết bạn
router.patch(
  "/request/:requestId/reject",
  FriendController.rejectFriendRequestController
);

// Hủy lời mời kết bạn (người gửi hủy)
router.delete(
  "/request/:requestId/cancel",
  FriendController.cancelFriendRequestController
);

// Hủy kết bạn
router.delete("/:friendId", FriendController.removeFriendController);

// Lấy danh sách bạn bè
router.get("/", FriendController.getFriendsController);

// Lấy danh sách lời mời kết bạn chưa xử lý
router.get(
  "/requests/pending",
  FriendController.getPendingFriendRequestsController
);

// Kiểm tra tình trạng bạn bè
router.get(
  "/status/:targetId",
  FriendController.checkFriendshipStatusController
);

// Đếm số bạn bè của một user
router.get("/count/:userId", FriendController.getFriendCountController);

export default router;
