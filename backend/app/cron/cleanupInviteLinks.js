// cron/cleanupInviteLinks.js
import cron from "node-cron";
import { db } from "../db/client.js";
import { inviteLinks } from "../db/schema.js";
import { lt, and, eq } from "drizzle-orm";

// Hàm dọn các link hết hạn
async function cleanupExpiredInviteLinks() {
  const now = new Date();

  try {
    // Xóa tất cả link đã hết hạn và chưa được dùng
    await db
      .delete(inviteLinks)
      .where(
        and(lt(inviteLinks.expiresAt, now), eq(inviteLinks.isUsed, false))
      );

    console.log(
      `[CLEANUP] ${new Date().toLocaleString("vi-VN")} - Dọn invite_links hết hạn thành công`
    );
  } catch (error) {
    console.error("[CLEANUP ERROR] Lỗi khi dọn invite_links:", error.message);
  }
}

//  Hàm khởi động cron job
export function startInviteLinkCleanupCron() {
  // Mỗi giờ 1 lần
  cron.schedule("0 * * * *", async () => {
    await cleanupExpiredInviteLinks();
  });

  console.log("[CRON] Đã bật cron job dọn invite_links hết hạn (mỗi 1h)");
}
