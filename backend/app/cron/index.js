import cron from "node-cron";
import { checkExpiredGroupOrders } from "./checkExpiredGroupOrders.js";
import { cancelUnpaidOrders } from "./cancelUnpaidOrders.js";
import { resetTimeoutGroupOrders } from "./resetTimeoutGroupOrders.js";

export const initCronJobs = (io) => {
  // Kiểm tra group order hết hạn mỗi phút
  cron.schedule("* * * * *", async () => {
    await checkExpiredGroupOrders(io);
  });

  // Hủy đơn awaiting_payment quá 30 phút — chạy mỗi phút
  cron.schedule("* * * * *", async () => {
    await cancelUnpaidOrders(io);
  });

  // Reset group orders "awaiting_payment" timeout về "locked" — chạy mỗi phút
  cron.schedule("* * * * *", async () => {
    await resetTimeoutGroupOrders();
  });

  console.log("Bật cron job kiểm tra group order hết hạn mỗi phút");
  console.log("Bật cron job hủy đơn chờ thanh toán quá 30 phút");
  console.log("Bật cron job reset group orders timeout về locked");
};
