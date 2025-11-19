const mongoose = require('mongoose');

/**
 * ============================================
 * ⭐ DANHGIA SCHEMA (REVIEW)
 * ============================================
 */
const DanhGiaSchema = new mongoose.Schema({
    IdSanPham: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SanPham',
        required: [true, 'ID sản phẩm là bắt buộc']
    },
    IdKhachHang: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taikhoan',
        required: [true, 'ID khách hàng là bắt buộc']
    },
    NoiDung: {
        type: String,
        required: [true, 'Nội dung đánh giá là bắt buộc'],
        trim: true,
        minlength: [10, 'Đánh giá phải có ít nhất 10 ký tự'],
        maxlength: [1000, 'Đánh giá không được quá 1000 ký tự']
    },
    SoSao: {
        type: Number,
        required: [true, 'Số sao đánh giá là bắt buộc'],
        min: [1, 'Số sao tối thiểu là 1'],
        max: [5, 'Số sao tối đa là 5'],
        validate: {
            validator: Number.isInteger,
            message: 'Số sao phải là số nguyên'
        }
    }
}, {
    timestamps: true,
    collection: 'DanhGia'
});

// ============================================
// INDEXES
// ============================================

DanhGiaSchema.index({ IdSanPham: 1 });
DanhGiaSchema.index({ IdKhachHang: 1 });
DanhGiaSchema.index({ createdAt: -1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

DanhGiaSchema.virtual('NgayTao').get(function() {
    return this.createdAt;
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Lấy đánh giá theo sản phẩm
 */
DanhGiaSchema.statics.findByProduct = function(productId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ IdSanPham: productId })
        .populate('IdKhachHang', 'HoTen AvatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Lấy đánh giá theo khách hàng
 */
DanhGiaSchema.statics.findByCustomer = function(customerId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ IdKhachHang: customerId })
        .populate('IdSanPham', 'TenSanPham IdTepAnh')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Đếm số đánh giá của sản phẩm
 */
DanhGiaSchema.statics.countByProduct = function(productId) {
    return this.countDocuments({ IdSanPham: productId });
};

/**
 * Tính điểm trung bình và phân bố sao
 */
DanhGiaSchema.statics.getProductRatingStats = async function(productId) {
    const stats = await this.aggregate([
        { $match: { IdSanPham: new mongoose.Types.ObjectId(productId) } },
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$SoSao' },
                totalReviews: { $sum: 1 },
                star5: { $sum: { $cond: [{ $eq: ['$SoSao', 5] }, 1, 0] } },
                star4: { $sum: { $cond: [{ $eq: ['$SoSao', 4] }, 1, 0] } },
                star3: { $sum: { $cond: [{ $eq: ['$SoSao', 3] }, 1, 0] } },
                star2: { $sum: { $cond: [{ $eq: ['$SoSao', 2] }, 1, 0] } },
                star1: { $sum: { $cond: [{ $eq: ['$SoSao', 1] }, 1, 0] } }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            avgRating: 0,
            totalReviews: 0,
            star5: 0,
            star4: 0,
            star3: 0,
            star2: 0,
            star1: 0
        };
    }

    return stats[0];
};

/**
 * Xóa tất cả đánh giá của sản phẩm
 */
DanhGiaSchema.statics.deleteByProduct = function(productId) {
    return this.deleteMany({ IdSanPham: productId });
};

/**
 * Xóa tất cả đánh giá của khách hàng
 */
DanhGiaSchema.statics.deleteByCustomer = function(customerId) {
    return this.deleteMany({ IdKhachHang: customerId });
};

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('DanhGia', DanhGiaSchema);
