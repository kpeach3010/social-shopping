import { useAuthStore } from "@/stores/auth";

/**
 * Đảm bảo chỉ chạy 1 lần và tránh gây reload liên tục.
 *
 * - Trả về Promise<boolean> khi auth.accessToken sẵn sàng.
 * - Không reactive, không gây vòng lặp khi token refresh.
 * - Có timeout fallback sau 5s để không treo app.
 */
export function useWaitForAuthReady(timeoutMs = 5000) {
  const auth = useAuthStore();

  // Nếu đã có accessToken => trả về ngay
  if (auth.accessToken) {
    return Promise.resolve(true);
  }

  // Nếu đang trong SSR => bỏ qua
  if (process.server) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let resolved = false;

    // Nếu token xuất hiện thì resolve 1 lần duy nhất
    const stop = watch(
      () => auth.accessToken,
      (token) => {
        if (token && !resolved) {
          resolved = true;
          stop();
          resolve(true);
        }
      },
      { immediate: false }
    );

    // fallback sau timeout để tránh treo
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        stop();
        resolve(false);
      }
    }, timeoutMs);
  });
}
