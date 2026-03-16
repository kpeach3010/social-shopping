# Social Shopping App

Dự án **Social Shopping App** là một nền tảng thương mại điện tử hiện đại, kết hợp giữa mua sắm trực tuyến, mạng xã hội và trí tuệ nhân tạo (AI). Dự án cho phép người dùng mua sắm theo nhóm để nhận ưu đãi, trò chuyện trực tiếp và đặc biệt là tính năng "Thử đồ ảo" (Visual Try-On) sử dụng mô hình **CAT-VTON**.

---

## Kiến trúc hệ thống

Hệ thống được thiết kế theo mô hình tách biệt rõ rệt giữa Frontend, Backend và các dịch vụ AI chuyên biệt:

*   **Web Client:** Xây dựng bằng Nuxt 3, mang lại trải nghiệm mượt mà và tối ưu SEO.
*   **Web Server (API):** Node.js & Express xử lý logic nghiệp vụ và kết nối dữ liệu.
*   **AI Service (Modal):** Chạy mô hình CAT-VTON trên GPU đám mây của Modal để chuyển đổi hình ảnh thử đồ.
*   **Database & Auth:** Sử dụng Supabase (Postgres) cho hiệu năng cao và bảo mật tuyệt đối.

---

## Tính năng nổi bật

1.  **Mua sắm nhóm (Group Ordering):** Người dùng có thể tạo hoặc tham gia nhóm để áp dụng các mã giảm giá đặc biệt.
2.  **AI Try-On (CAT-VTON):** Tải ảnh cá nhân và chọn sản phẩm để xem ngay kết quả mặc thử đồ nhờ công nghệ AI.
3.  **Real-time Chat:** Trò chuyện trực tiếp giữa các thành viên trong nhóm mua chung bằng Socket.io.
4.  **Mạng xã hội:** Đăng bài (Newsfeed), kết bạn, thích và bình luận về các sản phẩm/bài viết.
5.  **Thanh toán đa dạng:** Tích hợp PayPal.

---

## Công nghệ sử dụng

### Frontend
- **Framework:** [Nuxt 3](https://nuxt.com/) (Vue.js)
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Real-time:** [Socket.io Client](https://socket.io/)
- **Fonts:** Inter & Poppins (Google Fonts)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Real-time:** Socket.io Server
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage

### AI & Infrastructure
- **Model:** [CAT-VTON](https://github.com/zhengchong/CatVTON)
- **Execution:** [Modal](https://modal.com/) (Serverless GPU)
- **Database:** Supabase Postgres
- **Dev Tools:** Postman, Docker (Optional), ESLint

---

## Cơ cấu thư mục

```bash
social-shopping-app/
├── frontend/          # Mã nguồn Nuxt 3 (Giao diện người dùng)
├── backend/           # Mã nguồn Node.js & Express (API Server)
├── catvton-api/       # Mã nguồn Python/FastAPI (AI Server trên Modal)
└── package.json       # Quản lý dependency toàn cục
```

---

## Cài đặt & Chạy thử

### 1. Chuẩn bị
- Node.js >= 18.x
- Tài khoản Supabase (URL, Anon Key, Service Role Key)
- Tài khoản Modal (để chạy AI)
- Các tài khoản Sandbox cho PayPal (nếu cần test thanh toán)

### 2. Backend Setup
```bash
cd backend
npm install
# Tạo file .env dựa trên môi trường của bạn
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
# Tạo file .env (NUXT_PUBLIC_API_BASE, etc.)
npm run dev
```

### 4. AI API Setup (Modal)
```bash
cd catvton-api
# Cài đặt modal: pip install modal
modal deploy api_server.py
```

---

## Biến môi trường quan trọng

**Backend `.env`:**
- `DATABASE_URL`: Connection string Supabase Postgres.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: Quản lý Storage và Auth.
- `CATVTON_API_BASE`: URL của dịch vụ Modal sau khi deploy.
- `PAYPAL_CLIENT_ID` / `SECRET`: Cấu hình thanh toán.

**Frontend `.env`:**
- `NUXT_PUBLIC_API_BASE`: URL Backend Node.js.
- `NUXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`: Kết nối Supabase phía client.

---

## Đóng góp
Dự án được phát triển nhằm mục đích học tập và nghiên cứu ứng dụng AI vào Thương mại điện tử. Mọi đóng góp vui lòng mở Issue hoặc Pull Request.

---