import https from "https";
import http from "http";

const SELF_URL = process.env.RENDER_EXTERNAL_URL || "";

// Ping chính mình để Render không tắt server sau 15 phút idle
export const keepAlive = () => {
  if (!SELF_URL) {
    console.log("[KeepAlive] Bỏ qua — không tìm thấy RENDER_EXTERNAL_URL");
    return;
  }

  const client = SELF_URL.startsWith("https") ? https : http;

  client
    .get(SELF_URL, (res) => {
      console.log(`[KeepAlive] Ping OK — status: ${res.statusCode}`);
    })
    .on("error", (err) => {
      console.error(`[KeepAlive] Ping lỗi: ${err.message}`);
    });
};
