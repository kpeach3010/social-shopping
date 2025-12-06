import cron from "node-cron";
import { checkExpiredGroupOrders } from "./checkExpiredGroupOrders.js";

export const initCronJobs = (io) => {
  cron.schedule("* * * * *", async () => {
    await checkExpiredGroupOrders(io);
  });

  console.log("Bật cron job kiểm tra group order hết hạn mỗi phút");
};
