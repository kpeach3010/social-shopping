// cron/cleanupInviteLinks.js
import cron from "node-cron";
import { db } from "../db/client.js";
import { inviteLinks } from "../db/schema.js";
import { and, eq, lt, sql } from "drizzle-orm";

// Hàm dọn các link chưa được sử dụng
async function cleanupUnusedInviteLinks() {
  const now = new Date();
  
  // Chỉ xóa các link chưa dùng đã tạo cách đây ít nhất 180 phút để tránh xóa nhầm link vừa tạo
  const fiveMinutesAgo = new Date(now.getTime() - 180 * 60 * 1000);

  try {
    const deletedRecords = await db
      .delete(inviteLinks)
      .where(
        and(
          eq(inviteLinks.isUsed, false),
          lt(inviteLinks.createdAt, fiveMinutesAgo)
        )
      )
      .returning({ id: inviteLinks.id });

    if (deletedRecords.length > 0) {
      console.log(
        `[CLEANUP] ${new Date().toLocaleString("vi-VN")} - Đã dọn dẹp ${deletedRecords.length} link chưa sử dụng.`
      );
    }
  } catch (error) {
    // Log chi tiết lỗi nếu có
    console.error("[CLEANUP ERROR] Lỗi khi dọn invite_links:", error);
  }
}

// === CẤU HÌNH THỜI GIAN CHẠY TẠI ĐÂY ===
const CLEANUP_CRON_SCHEDULE = "*/10 * * * *"; // Chạy mỗi 10 phút

//  Hàm khởi động cron job
export function startInviteLinkCleanupCron() {
  cron.schedule(CLEANUP_CRON_SCHEDULE, async () => {
    await cleanupUnusedInviteLinks();
  });

  console.log(`[CRON] Đã bật dọn invite_links chưa dùng (Chu kỳ: ${CLEANUP_CRON_SCHEDULE})`);
}
