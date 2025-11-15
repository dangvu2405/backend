const express = require('express');
const router = express.Router();
const DanhGiaController = require('../app/controllers/DanhGiaController');
const authMiddleware = require('../app/middlewares/auth.middleware');

// ============================================
// PUBLIC ROUTES (không cần đăng nhập)
// ============================================

// Lấy thống kê rating của sản phẩm (đặt trước để tránh conflict)
router.get('/product/:productId/stats', DanhGiaController.getProductRatingStats);

// ============================================
// PROTECTED ROUTES (cần đăng nhập)
// ============================================

// Tạo đánh giá mới
router.post('/', authMiddleware, DanhGiaController.createReview);

// Lấy đánh giá của user cho sản phẩm (đặt trước route tổng quát)
router.get('/product/:productId/my-review', authMiddleware, DanhGiaController.getMyReview);

// ============================================
// PUBLIC ROUTES (tiếp tục)
// ============================================

// Lấy danh sách đánh giá của sản phẩm (đặt sau route cụ thể)
router.get('/product/:productId', DanhGiaController.getProductReviews);

// Lấy tất cả đánh giá của user
router.get('/my-reviews', authMiddleware, DanhGiaController.getMyReviews);

// Cập nhật đánh giá
router.put('/:id', authMiddleware, DanhGiaController.updateReview);

// Xóa đánh giá
router.delete('/:id', authMiddleware, DanhGiaController.deleteReview);

module.exports = router;

