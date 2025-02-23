const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Kiểm tra user có tồn tại không
        const user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "User đã tồn tại" });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user mới
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.json({ message: "Đăng ký thành công", newUser });
    } catch (error) {
        console.error("❌ Lỗi đăng ký:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, location } = req.body;

        // Kiểm tra user có tồn tại không
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User không tồn tại" });

        // Kiểm tra password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu sai" });

        // Cập nhật lịch sử đăng nhập + vị trí
        user.loginHistory.push({ location });
        await user.save();

        // Tạo JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, "SECRET_KEY", { expiresIn: "1h" });

        res.json({ message: "Đăng nhập thành công", token, user });
    } catch (error) {
        console.error("❌ Lỗi đăng nhập:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.getLoginHistory = async (req, res) => {
    try {
        const users = await User.find({}, "name email loginHistory");
        res.json(users);
    } catch (error) {
        console.error("❌ Lỗi lấy lịch sử đăng nhập:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

