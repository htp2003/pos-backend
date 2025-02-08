const Product = require('../models/Product');

// Lấy tất cả sản phẩm
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Thêm sản phẩm mới
exports.createProduct = async (req, res) => {
    // Kiểm tra nếu thiếu trường bắt buộc
    const { name, price, category, description, imageUrl } = req.body;

    if (!name || !price || !category) {
        return res.status(400).json({ message: "Name, price, and category are required!" });
    }

    const product = new Product({
        name,
        price,
        category,  // Đừng quên thêm category
        description,
        imageUrl
    });

    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.remove();
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Cập nhật thông tin sản phẩm từ request body
        product.name = req.body.name || product.name;
        product.price = req.body.price || product.price;
        product.category = req.body.category || product.category;
        product.description = req.body.description || product.description;
        product.imageUrl = req.body.imageUrl || product.imageUrl;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
