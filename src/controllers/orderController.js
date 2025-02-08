const Order = require("../models/Order");
const Product = require("../models/Product");
const axios = require("axios");
// Get all orders
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate("products.productId");
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Invalid products data" });
        }

        let totalPrice = 0;
        const orderProducts = [];

        // Validate và tính toán giá từng sản phẩm
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({
                    message: `Product not found with id: ${item.productId}`
                });
            }

            orderProducts.push({
                productId: product._id,
                quantity: item.quantity
            });

            totalPrice += product.price * item.quantity;
        }

        const order = new Order({
            products: orderProducts,
            totalPrice
        });

        const newOrder = await order.save();
        res.status(201).json(newOrder);
    } catch (err) {
        console.error("Error creating order:", err);
        res.status(400).json({
            message: "Error creating order",
            error: err.message
        });
    }
};


// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.status = req.body.status || order.status;
        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Delete order
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        await order.deleteOne();
        res.json({ message: "Order deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.createVietQR = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Tạo link VietQR
        const bankId = "vietinbank";
        const accountNo = "108874066025";
        const accountName = "HA TAN PHAT";
        const amount = order.totalPrice;
        const description = `ORDER-${orderId}`;

        const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${description}&accountName=${encodeURIComponent(accountName)}`;

        res.json({ orderId, qrUrl });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Trong orderController.js, cập nhật lại phương thức checkVietQRPayment:
exports.checkVietQRPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        // Validate orderId
        if (!orderId) {
            return res.status(400).json({ message: "OrderId is required" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Nếu đơn hàng đã thanh toán rồi, trả về luôn
        if (order.status === "paid") {
            return res.json({ orderId, status: "paid" });
        }

        const googleSheetApiUrl = "https://script.google.com/macros/s/AKfycbw-dQLrcfN9h31svIfqFrr8GWizbWUbhlNjf59hyu4o/dev";

        try {
            // Gọi API để lấy danh sách giao dịch từ Google Sheets
            const response = await axios.get(googleSheetApiUrl);

            if (!response.data || !response.data.data) {
                console.error("Invalid response from Google Sheets:", response.data);
                return res.status(500).json({ message: "Invalid transaction data format" });
            }

            const transactions = response.data.data;
            const totalAmount = order.totalPrice;
            const orderIdentifier = `ORDER-${orderId}`;

            // Tìm giao dịch hợp lệ
            const matchedTransaction = transactions.find(tx =>
                tx["Mô tả"] &&
                tx["Mô tả"].includes(orderIdentifier) &&
                parseFloat(tx["Giá trị"]) === totalAmount
            );

            if (matchedTransaction) {
                order.status = "paid";
                await order.save();
                return res.json({
                    orderId,
                    status: "paid",
                    transactionId: matchedTransaction["Mã GD"]
                });
            }

            res.json({ orderId, status: "pending" });
        } catch (error) {
            console.error("Error checking Google Sheets:", error);
            res.status(500).json({
                message: "Error checking payment status",
                error: error.message
            });
        }
    } catch (err) {
        console.error("Server error:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
};

exports.confirmPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log("Received confirmPayment request for orderId:", orderId);

        // Validate orderId
        if (!orderId) {
            console.log("OrderId is missing");
            return res.status(400).json({ message: "OrderId is required" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            console.log("Order not found:", orderId);
            return res.status(404).json({ message: "Order not found" });
        }

        console.log("Current order status:", order.status);

        // Kiểm tra nếu đơn đã thanh toán
        if (order.status === "paid") {
            console.log("Order already paid");
            return res.json({
                message: "Order already paid",
                orderId,
                status: "paid"
            });
        }

        // Cập nhật trạng thái
        order.status = "paid";
        await order.save();
        console.log("Order status updated to paid");

        res.json({
            message: "Payment confirmed successfully",
            orderId,
            status: "paid"
        });
    } catch (err) {
        console.error("Error in confirmPayment:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
};
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("products.productId");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};