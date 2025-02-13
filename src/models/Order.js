const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            quantity: { type: Number, required: true, min: 1 },
        },
    ],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
    createdAt: { type: Date, default: Date.now },

    paymentMethod: {
        type: String,
        enum: ["cash", "qr"],
        default: "qr"
    },
    cashPayment: {
        received: { type: Number },
        change: { type: Number }
    }
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;