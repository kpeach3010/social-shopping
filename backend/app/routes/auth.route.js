const express = require("express");
const AuthController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", AuthController.registerController);
router.post("/login", AuthController.loginController);

module.exports = router;
