const express = require("express");
const cors = require("cors");

const authRoutes = require("./app/routes/auth.route");
const userRoutes = require("./app/routes/user.route");
const categoryRoutes = require("./app/routes/category.route");
const productRoutes = require("./app/routes/product.route");
const couponRoutes = require("./app/routes/coupon.route");
const cartRoutes = require("./app/routes/cart.route");
const orderRoutes = require("./app/routes/order.route");
const {
  notFoundHandler,
  internalHandler,
} = require("./app/middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/product", productRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Social Shopping App API!" });
});

app.use(notFoundHandler);
app.use(internalHandler);
module.exports = app;
