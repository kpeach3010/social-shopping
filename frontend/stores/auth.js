export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    accessToken: null,
  }),
  actions: {
    setAuth(user, token) {
      this.user = user;
      this.accessToken = token;
      if (process.client) {
        localStorage.setItem("accessToken", token);
        localStorage.setItem("user", JSON.stringify(user)); // lưu user thật
      }
    },
    logout() {
      this.user = null;
      this.accessToken = null;
      if (process.client) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
    },
    loadFromStorage() {
      if (process.client) {
        const token = localStorage.getItem("accessToken");
        const userStr = localStorage.getItem("user");
        if (token) {
          this.accessToken = token;
          if (userStr) {
            this.user = JSON.parse(userStr); // lấy đúng user từ localStorage
          }
        }
      }
    },
  },
  getters: {
    isLoggedIn: (state) => !!state.accessToken,
  },
});
