// stores/auth.js
export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isTokenRefreshing: false,
  }),

  getters: {
    isLoggedIn: (s) => !!s.accessToken,
  },

  actions: {
    setAuth(user, accessToken, refreshToken) {
      // ❗ Không thay user nếu refresh không trả user
      if (user && user.id) {
        this.user = user; // user từ DB
      }

      // luôn cập nhật accessToken
      if (accessToken) this.accessToken = accessToken;

      // refreshToken có thể không đổi
      if (typeof refreshToken === "string") {
        this.refreshToken = refreshToken;
      }

      // ---- LƯU VÀO LOCALSTORAGE AN TOÀN ----
      if (process.client) {
        if (this.accessToken) {
          localStorage.setItem("accessToken", this.accessToken);
        }

        // ❗ Không xoá user khi undefined — giữ nguyên user cũ
        if (this.user) {
          localStorage.setItem("user", JSON.stringify(this.user));
        }

        if (this.refreshToken) {
          localStorage.setItem("refreshToken", this.refreshToken);
        }
      }

      // sự kiện cập nhật UI
      if (process.client) {
        window.dispatchEvent(new Event("auth-changed"));
      }
    },

    logout() {
      // chỉ gọi khi user thật sự logout
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;

      if (process.client) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    },

    loadFromStorage() {
      if (!process.client) return;

      const at = localStorage.getItem("accessToken");
      const rt = localStorage.getItem("refreshToken");
      const us = localStorage.getItem("user");

      this.accessToken = at || null;
      this.refreshToken = rt || null;
      this.user = us ? JSON.parse(us) : null;
    },
  },
});
