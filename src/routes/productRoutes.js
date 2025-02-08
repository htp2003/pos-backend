const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Lấy tất cả sản phẩm
router.get('/', productController.getProducts);

// Thêm sản phẩm mới
router.post('/', productController.createProduct);

// Xóa sản phẩm
router.delete('/:id', productController.deleteProduct);

//update
router.put("/:id", productController.updateProduct);


module.exports = router;
