const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "cashier" },
    loginHistory: [
        {
            timestamp: { type: Date, default: Date.now },
            locationStr: { type: String, default: 'Không có vị trí' },
            location: {
                latitude: Number,
                longitude: Number
            }
        }
    ]
});

const User = mongoose.model("User", userSchema);
module.exports = User;
