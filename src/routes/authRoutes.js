const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.get("/login-history", authController.getLoginHistory); // Chỉ admin gọi
router.post("/register", authController.register);
router.post("/logout", authController.logout);
module.exports = router;
