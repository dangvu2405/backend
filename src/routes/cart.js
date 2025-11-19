const express = require('express');
const router = express.Router();
const GioHangController = require('../app/controllers/GioHangController');
const DonHangController = require('../app/controllers/DonHangController');
const optionalAuthMiddleware = require('../app/middlewares/optionalAuth.middleware');

router.post('/add-to-cart', GioHangController.addToCart);
router.get('/get-cart', GioHangController.getCart);
router.post('/update-cart', GioHangController.updateCart);
router.post('/checkout', optionalAuthMiddleware, DonHangController.checkout);
module.exports = router;