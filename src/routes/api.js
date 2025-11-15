const express = require('express');
const router = express.Router();
const SanPhamController = require('../app/controllers/SanPhamController');
const LoaiSanPhamController = require('../app/controllers/LoaiSanPhamController');

// Health check endpoint for Render
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString()
    });
});

router.get('/products', SanPhamController.getAllProducts);
router.get('/categories', LoaiSanPhamController.getAllCategories);
router.get('/products/:id', SanPhamController.getProduct);
module.exports = router;

