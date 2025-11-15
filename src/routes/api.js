const express = require('express');
const router = express.Router();
const SanPhamController = require('../app/controllers/SanPhamController');
const LoaiSanPhamController = require('../app/controllers/LoaiSanPhamController');

router.get('/products', SanPhamController.getAllProducts);
router.get('/categories', LoaiSanPhamController.getAllCategories);
router.get('/products/:id', SanPhamController.getProduct);
module.exports = router;

