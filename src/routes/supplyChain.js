const express = require('express');
const SupplyChainController = require('../app/controllers/SupplyChainController');
const authMiddleware = require('../app/middlewares/auth.middleware');
const adminMiddleware = require('../app/middlewares/admin.middleware');

const router = express.Router();

// Public routes
router.get('/products/:productId/trace', SupplyChainController.getProductTrace);
router.get('/lookup', SupplyChainController.lookupTrace);

// Admin routes - require authentication and admin role
router.post('/admin/products/:productId/init', authMiddleware, adminMiddleware, SupplyChainController.initProduct);
router.post('/admin/products/:productId/events', authMiddleware, adminMiddleware, SupplyChainController.recordEvent);
router.post('/admin/products/:productId/certificates', authMiddleware, adminMiddleware, SupplyChainController.issueCertificate);

module.exports = router;

