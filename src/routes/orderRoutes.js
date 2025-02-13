const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.get("/", orderController.getOrders);
router.post("/", orderController.createOrder);
router.put("/:id", orderController.updateOrderStatus);
router.delete("/:id", orderController.deleteOrder);
router.get("/:id", orderController.getOrderById);
router.get("/:id/invoice", orderController.generateInvoice);
//payemnt route:
router.post("/payment/qr", orderController.createVietQR);
// router.post("/payment/check", orderController.checkVietQRPayment);
router.patch("/payment/confirm", orderController.confirmPayment);
router.post("/payment/check-casso", orderController.checkCassoPayment);

//dashboard route:
router.get("/stats/dashboard", orderController.getDashboardStats);

module.exports = router;
