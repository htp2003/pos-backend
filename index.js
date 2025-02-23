const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Routes
const productRoute = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const authRoutes = require("./src/routes/authRoutes");



const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());

// Middleware
app.use(express.json());

// Kết nối MongoDB
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoute);
app.use("/api/auth", authRoutes);

// Route test
app.get("/", (req, res) => {
    res.send("🚀 POS Backend is running...");
});

// Start server
app.listen(PORT, () => {
    console.log(`⚡ Server is running on http://localhost:${PORT}`);
});
