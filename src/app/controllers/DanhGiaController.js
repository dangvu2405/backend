const DanhGia = require('../models/DanhGia');
const SanPham = require('../models/SanPham');
const mongoose = require('mongoose');

class DanhGiaController {
    /**
     * Tạo đánh giá mới
     * POST /api/reviews
     */
    async createReview(req, res) {
        try {
            const { IdSanPham, NoiDung, SoSao } = req.body;
            const IdKhachHang = req.user?.id;

            // Validate
            if (!IdSanPham || !NoiDung || !SoSao) {
                return res.status(400).json({
                    message: 'Vui lòng nhập đầy đủ thông tin đánh giá'
                });
            }

            if (!IdKhachHang) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập để đánh giá'
                });
            }

            // Kiểm tra sản phẩm tồn tại
            const product = await SanPham.findById(IdSanPham);
            if (!product) {
                return res.status(404).json({
                    message: 'Không tìm thấy sản phẩm'
                });
            }

            // Kiểm tra đã đánh giá chưa
            const existingReview = await DanhGia.findOne({
                IdSanPham,
                IdKhachHang
            });

            if (existingReview) {
                return res.status(400).json({
                    message: 'Bạn đã đánh giá sản phẩm này rồi'
                });
            }

            // Tạo đánh giá mới
            const review = await DanhGia.create({
                IdSanPham,
                IdKhachHang,
                NoiDung,
                SoSao: parseInt(SoSao)
            });

            // Populate thông tin khách hàng
            await review.populate('IdKhachHang', 'HoTen AvatarUrl');

            return res.status(201).json({
                message: 'Đánh giá thành công',
                data: review
            });
        } catch (error) {
            console.error('Lỗi khi tạo đánh giá:', error);
            return res.status(500).json({
                message: 'Lỗi khi tạo đánh giá',
                error: error.message
            });
        }
    }

    /**
     * Lấy danh sách đánh giá của sản phẩm
     * GET /api/reviews/product/:productId
     */
    async getProductReviews(req, res) {
        try {
            const { productId } = req.params;
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            console.log('📥 Getting reviews for product:', productId);

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    message: 'ID sản phẩm không hợp lệ'
                });
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const [reviews, total] = await Promise.all([
                DanhGia.find({ IdSanPham: productId })
                    .populate('IdKhachHang', 'HoTen AvatarUrl Email')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                DanhGia.countDocuments({ IdSanPham: productId })
            ]);

            console.log('✅ Found reviews:', reviews.length, 'Total:', total);
            console.log('📝 Sample review:', reviews[0]);

            return res.status(200).json({
                message: 'Lấy danh sách đánh giá thành công',
                data: reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('❌ Lỗi khi lấy danh sách đánh giá:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy danh sách đánh giá',
                error: error.message
            });
        }
    }

    /**
     * Lấy thống kê rating của sản phẩm
     * GET /api/reviews/product/:productId/stats
     */
    async getProductRatingStats(req, res) {
        try {
            const { productId } = req.params;

            console.log('📊 Getting stats for product:', productId);

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    message: 'ID sản phẩm không hợp lệ'
                });
            }

            const stats = await DanhGia.getProductRatingStats(productId);

            console.log('✅ Stats result:', stats);

            return res.status(200).json({
                message: 'Lấy thống kê đánh giá thành công',
                data: stats
            });
        } catch (error) {
            console.error('❌ Lỗi khi lấy thống kê đánh giá:', error);
            console.error('Error stack:', error.stack);
            return res.status(500).json({
                message: 'Lỗi khi lấy thống kê đánh giá',
                error: error.message
            });
        }
    }

    /**
     * Lấy đánh giá của user hiện tại cho sản phẩm
     * GET /api/reviews/product/:productId/my-review
     */
    async getMyReview(req, res) {
        try {
            const { productId } = req.params;
            // req.user là user object từ database, có _id chứ không phải id
            const IdKhachHang = req.user?._id?.toString() || req.user?.id?.toString();

            console.log('getMyReview - User:', {
                hasUser: !!req.user,
                userId: IdKhachHang,
                productId: productId
            });

            if (!IdKhachHang) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    message: 'ID sản phẩm không hợp lệ'
                });
            }

            const review = await DanhGia.findOne({
                IdSanPham: productId,
                IdKhachHang
            }).populate('IdKhachHang', 'HoTen AvatarUrl Email');

            if (!review) {
                return res.status(404).json({
                    message: 'Bạn chưa đánh giá sản phẩm này'
                });
            }

            return res.status(200).json({
                message: 'Lấy đánh giá thành công',
                data: review
            });
        } catch (error) {
            console.error('Lỗi khi lấy đánh giá:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy đánh giá',
                error: error.message
            });
        }
    }

    /**
     * Cập nhật đánh giá
     * PUT /api/reviews/:id
     */
    async updateReview(req, res) {
        try {
            const { id } = req.params;
            const { NoiDung, SoSao } = req.body;
            const IdKhachHang = req.user?.id;

            if (!IdKhachHang) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập'
                });
            }

            const review = await DanhGia.findById(id);

            if (!review) {
                return res.status(404).json({
                    message: 'Không tìm thấy đánh giá'
                });
            }

            // Kiểm tra quyền sở hữu
            if (review.IdKhachHang.toString() !== IdKhachHang) {
                return res.status(403).json({
                    message: 'Bạn không có quyền chỉnh sửa đánh giá này'
                });
            }

            // Update
            if (NoiDung) review.NoiDung = NoiDung;
            if (SoSao) review.SoSao = parseInt(SoSao);

            await review.save();
            await review.populate('IdKhachHang', 'HoTen AvatarUrl Email');

            return res.status(200).json({
                message: 'Cập nhật đánh giá thành công',
                data: review
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật đánh giá:', error);
            return res.status(500).json({
                message: 'Lỗi khi cập nhật đánh giá',
                error: error.message
            });
        }
    }

    /**
     * Xóa đánh giá
     * DELETE /api/reviews/:id
     */
    async deleteReview(req, res) {
        try {
            const { id } = req.params;
            const IdKhachHang = req.user?.id;

            if (!IdKhachHang) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập'
                });
            }

            const review = await DanhGia.findById(id);

            if (!review) {
                return res.status(404).json({
                    message: 'Không tìm thấy đánh giá'
                });
            }

            // Kiểm tra quyền sở hữu
            if (review.IdKhachHang.toString() !== IdKhachHang) {
                return res.status(403).json({
                    message: 'Bạn không có quyền xóa đánh giá này'
                });
            }

            await review.deleteOne();

            return res.status(200).json({
                message: 'Xóa đánh giá thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xóa đánh giá:', error);
            return res.status(500).json({
                message: 'Lỗi khi xóa đánh giá',
                error: error.message
            });
        }
    }

    /**
     * Lấy đánh giá của user
     * GET /api/reviews/my-reviews
     */
    async getMyReviews(req, res) {
        try {
            const IdKhachHang = req.user?.id;
            const { page = 1, limit = 10 } = req.query;

            if (!IdKhachHang) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập'
                });
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const [reviews, total] = await Promise.all([
                DanhGia.find({ IdKhachHang })
                    .populate('IdSanPham', 'TenSanPham HinhAnhChinh Gia')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                DanhGia.countDocuments({ IdKhachHang })
            ]);

            return res.status(200).json({
                message: 'Lấy danh sách đánh giá thành công',
                data: reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đánh giá:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy danh sách đánh giá',
                error: error.message
            });
        }
    }
}

module.exports = new DanhGiaController();

