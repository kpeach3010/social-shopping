const app = require("./app");
const config = require("./app/config");
const {
  createUserService,
  checkUserAdminExists,
} = require("./app/services/user.service.js");

async function startServer() {
  try {
    const PORT = config.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    // Kiểm tra và tạo user admin nếu chưa tồn tại
    const adminExists = await checkUserAdminExists();
    console.log("Admin user exists:", adminExists);
    if (!adminExists) {
      const adminData = {
        email: "admin@gmail.com",
        password: "admin123",
        fullName: "Admin User",
        role: "admin",
      };
      await createUserService(adminData);
    }
  } catch (error) {
    console.log("Cannot connect to the database!", error);
    process.exit();
  }
}

startServer();
