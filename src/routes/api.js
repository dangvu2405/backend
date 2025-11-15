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

router.get('/products', (req, res, next) => {
    console.log('🛍️  GET /api/products - Request details:', {
        query: req.query,
        limit: req.query.limit,
        page: req.query.page,
        origin: req.headers.origin,
        host: req.headers.host
    });
    SanPhamController.getAllProducts(req, res, next);
});
router.get('/categories', LoaiSanPhamController.getAllCategories);
router.get('/products/:id', SanPhamController.getProduct);
module.exports = router;

