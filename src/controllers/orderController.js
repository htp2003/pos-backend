const Order = require("../models/Order");
const Product = require("../models/Product");
const axios = require("axios");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
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



exports.confirmPayment = async (req, res) => {
    try {
        const { orderId, paymentMethod, cashReceived, change } = req.body;
        console.log("Received confirmPayment request:", { orderId, paymentMethod, cashReceived, change });

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

        // Cập nhật thông tin thanh toán
        order.status = "paid";
        order.paymentMethod = paymentMethod || "qr";

        // Thêm thông tin thanh toán tiền mặt nếu có
        if (paymentMethod === "cash") {
            order.cashPayment = {
                received: cashReceived,
                change: change
            };
        }

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

exports.generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log("Generating invoice for order:", orderId);

        const order = await Order.findById(orderId).populate('products.productId');
        if (!order) {
            console.log("Order not found:", orderId);
            return res.status(404).json({ message: "Order not found" });
        }

        // Tạo PDF document với font Unicode
        const doc = new PDFDocument({
            font: path.join(__dirname, '../fonts/NotoSans-Regular.ttf'),
            size: 'A4',
            margin: 50
        });

        // Đăng ký font Unicode
        doc.registerFont('NotoSans', path.join(__dirname, '../fonts/NotoSans-Regular.ttf'));
        doc.registerFont('NotoSans-Bold', path.join(__dirname, '../fonts/NotoSans-Bold.ttf'));

        const filename = `invoice-${orderId}.pdf`;
        doc.pipe(res);

        // Header với font Unicode
        doc.font('NotoSans-Bold').fontSize(20).text('HÓA ĐƠN BÁN HÀNG', { align: 'center' });
        doc.moveDown();

        // Thông tin đơn hàng
        doc.font('NotoSans').fontSize(12)
            .text(`Mã đơn hàng: ${orderId}`)
            .text(`Ngày: ${new Date().toLocaleString('vi-VN')}`);
        doc.moveDown();

        // Table header
        doc.font('NotoSans-Bold')
            .text('STT    Tên sản phẩm                  Số lượng    Đơn giá         Thành tiền', {
                underline: true
            });
        doc.moveDown();

        // Products
        doc.font('NotoSans');
        let y = doc.y;
        order.products.forEach((item, index) => {
            const product = item.productId;
            const total = product.price * item.quantity;

            // Định dạng text để tránh lỗi encoding
            const formattedText = `${index + 1}      ${product.name.padEnd(30)}` +
                `${item.quantity.toString().padStart(5)}     ` +
                `${product.price.toLocaleString('vi-VN').padStart(10)}    ` +
                `${total.toLocaleString('vi-VN').padStart(15)}`;

            doc.text(formattedText, { continued: false });
            y = doc.y;
        });

        // Total
        doc.moveDown()
            .text('-'.repeat(95));

        doc.font('NotoSans-Bold')
            .fontSize(14)
            .text(`Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VND`, {
                align: 'right'
            });

        // Footer
        doc.moveDown(2)
            .font('NotoSans')
            .fontSize(10)
            .text('Cảm ơn quý khách đã mua hàng!', {
                align: 'center'
            });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        doc.end();

    } catch (err) {
        console.error("Error generating invoice:", err);
        res.status(500).json({
            message: "Error generating invoice",
            error: err.message
        });
    }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const { range } = req.query; // 'week' hoặc 'month'
        const daysToLookback = range === 'month' ? 30 : 7;

        // Lấy ngày bắt đầu thống kê
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysToLookback);
        startDate.setHours(0, 0, 0, 0);

        // Lấy tất cả đơn hàng từ startDate đến hiện tại
        const orders = await Order.find({
            createdAt: { $gte: startDate },
            status: "paid"
        }).populate("products.productId");

        // Tính tổng doanh thu và số đơn hàng
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Tính doanh thu theo ngày
        const dailySales = [];
        for (let i = 0; i < daysToLookback; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const dayOrders = orders.filter(order =>
                order.createdAt >= date && order.createdAt < nextDate
            );

            const total = dayOrders.reduce((sum, order) => sum + order.totalPrice, 0);

            dailySales.unshift({
                date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                total
            });
        }

        // Tính top sản phẩm bán chạy
        const productStats = new Map();

        orders.forEach(order => {
            order.products.forEach(item => {
                const product = item.productId;
                if (!productStats.has(product._id)) {
                    productStats.set(product._id, {
                        _id: product._id,
                        name: product.name,
                        totalQuantity: 0,
                        totalRevenue: 0
                    });
                }

                const stats = productStats.get(product._id);
                stats.totalQuantity += item.quantity;
                stats.totalRevenue += product.price * item.quantity;
            });
        });

        const topProducts = Array.from(productStats.values())
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);

        res.json({
            totalRevenue,
            totalOrders,
            averageOrderValue,
            dailySales,
            topProducts
        });

    } catch (err) {
        console.error("Error getting dashboard stats:", err);
        res.status(500).json({
            message: "Error getting dashboard stats",
            error: err.message
        });
    }
};

exports.checkCassoPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ message: "OrderId is required" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const cassoApiUrl = "https://oauth.casso.vn/v2/transactions?pageSize=100";
        const apiKey = process.env.CASSO_API_KEY;

        const response = await axios.get(cassoApiUrl, {
            headers: { Authorization: `Apikey ${apiKey}` }
        });

        console.log("🔍 Casso Response:", response.data);

        if (!response.data || response.data.error !== 0) {
            return res.status(500).json({ message: "Failed to fetch transaction data" });
        }

        const transactions = response.data.data.records;
        const totalAmount = order.totalPrice;
        const orderIdentifier = `ORDER${orderId.replace(/\s/g, "")}`; // Loại bỏ khoảng trắng

        console.log(`🧐 Đang tìm: "${orderIdentifier}" với số tiền: ${totalAmount}`);

        transactions.forEach(tx => {
            console.log(`📌 Giao dịch: "${tx.description}" | Số tiền: ${tx.amount}`);
        });

        const matchedTransaction = transactions.find(tx =>
            tx.description.replace(/\s/g, "").includes(orderIdentifier) &&
            Number(tx.amount) === Number(totalAmount)  // Đảm bảo kiểu số chính xác
        );

        if (matchedTransaction) {
            order.status = "paid";
            await order.save();
            return res.json({
                orderId,
                status: "paid",
                transactionId: matchedTransaction.tid
            });
        }

        res.json({ orderId, status: "pending" });
    } catch (err) {
        console.error("❌ Error in checkCassoPayment:", err);
        res.status(500).json({ message: "Error checking payment", error: err.message });
    }
};
