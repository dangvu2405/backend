const express = require('express');
const router = express.Router();
const VNPayController = require('../app/controllers/VNPayController');
const optionalAuthMiddleware = require('../app/middlewares/optionalAuth.middleware');

// VNPay routes - Optional auth để hỗ trợ guest checkout
router.post('/vnpay/create-payment-url', optionalAuthMiddleware, VNPayController.createPaymentUrl);
router.post('/vnpay/create-qr', optionalAuthMiddleware, VNPayController.createQRCode);
router.get('/vnpay/return', VNPayController.vnpayReturn); // Public route - Return URL (redirect browser)
router.get('/vnpay/ipn', VNPayController.vnpayIpn); // Public route - IPN URL (server-to-server notification)

module.exports = router;

