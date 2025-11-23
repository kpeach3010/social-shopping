import express from "express";
import cors from "cors";

import authRoutes from "./app/routes/auth.route.js";
import userRoutes from "./app/routes/user.route.js";
import categoryRoutes from "./app/routes/category.route.js";
import productRoutes from "./app/routes/product.route.js";
import couponRoutes from "./app/routes/coupon.route.js";
import cartRoutes from "./app/routes/cart.route.js";
import orderRoutes from "./app/routes/order.route.js";
import conversationRoutes from "./app/routes/conversation.route.js";
import messageRoutes from "./app/routes/message.route.js";
import groupOrderRoutes from "./app/routes/groupOrder.route.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://social-shopping.vercel.app", // FE deploy Vercel
      "https://social-shopping-production.up.railway.app", // domain FE gọi API
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);

import {
  notFoundHandler,
  internalHandler,
} from "./app/middlewares/error.middleware.js";

app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/product", productRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/group-orders", groupOrderRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Social Shopping App API!" });
});

app.use(notFoundHandler);
app.use(internalHandler);

export default app;
