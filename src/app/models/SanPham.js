const mongoose = require('mongoose');

/**
 * ============================================
 * 📦 SANPHAM SCHEMA (PRODUCT)
 * ============================================
 */
const SanPhamSchema = new mongoose.Schema({
    TenSanPham: {
        type: String,
        required: [true, 'Tên sản phẩm là bắt buộc'],
        trim: true,
        minlength: [2, 'Tên sản phẩm phải có ít nhất 2 ký tự'],
        maxlength: [200, 'Tên sản phẩm không được quá 200 ký tự']
    },
    MaLoaiSanPham: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoaiSanPham',
        required: [true, 'Loại sản phẩm là bắt buộc']
    },
    Gia: {
        type: Number,
        required: [true, 'Giá sản phẩm là bắt buộc'],
        min: [0, 'Giá không được âm']
    },
    KhuyenMai: {
        type: Number,
        default: 0,
        min: [0, 'Khuyến mãi không được âm'],
        max: [100, 'Khuyến mãi không được quá 100%']
    },
    MoTa: {
        type: String,
        default: '',
        maxlength: [5000, 'Mô tả không được quá 5000 ký tự']
    },
    SoLuong: {
        type: Number,
        required: [true, 'Số lượng là bắt buộc'],
        default: 0,
        min: [0, 'Số lượng không được âm']
    },
    DaBan: {
        type: Number,
        default: 0,
        min: [0, 'Số lượng đã bán không được âm']
    },
    IdTepAnh: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TepAnhSanPham',
        default: null
    },
    HinhAnhChinh: {
        type: String,
        default: '',
        trim: true
    },
    HinhAnhPhu: {
        type: [String],
        default: [],
        validate: {
            validator: function(images) {
                return images.length <= 10;
            },
            message: 'Không thể có quá 10 ảnh phụ'
        }
    }
}, {
    timestamps: true,
    collection: 'SanPham'
});

// ============================================
// INDEXES
// ============================================

SanPhamSchema.index({ TenSanPham: 'text' });
SanPhamSchema.index({ MaLoaiSanPham: 1 });
SanPhamSchema.index({ Gia: 1 });
SanPhamSchema.index({ DaBan: -1 });
SanPhamSchema.index({ createdAt: -1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

SanPhamSchema.virtual('NgayTao').get(function() {
    return this.createdAt;
});

SanPhamSchema.virtual('NgayCapNhat').get(function() {
    return this.updatedAt;
});

/**
 * Giá sau khuyến mãi
 */
SanPhamSchema.virtual('GiaSauKhuyenMai').get(function() {
    if (this.KhuyenMai > 0) {
        return this.Gia * (1 - this.KhuyenMai / 100);
    }
    return this.Gia;
});

/**
 * Còn hàng không
 */
SanPhamSchema.virtual('ConHang').get(function() {
    return this.SoLuong > 0;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Kiểm tra còn đủ hàng không
 */
SanPhamSchema.methods.hasStock = function(quantity) {
    return this.SoLuong >= quantity;
};

/**
 * Giảm số lượng tồn kho
 */
SanPhamSchema.methods.decreaseStock = async function(quantity) {
    if (!this.hasStock(quantity)) {
        throw new Error('Không đủ hàng trong kho');
    }
    this.SoLuong -= quantity;
    this.DaBan += quantity;
    return this.save();
};

/**
 * Tăng số lượng tồn kho
 */
SanPhamSchema.methods.increaseStock = async function(quantity) {
    this.SoLuong += quantity;
    return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Tìm kiếm sản phẩm
 */
SanPhamSchema.statics.search = function(keyword, options = {}) {
    const query = {
        $or: [
            { TenSanPham: { $regex: keyword, $options: 'i' } },
            { MoTa: { $regex: keyword, $options: 'i' } }
        ]
    };

    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find(query)
        .populate('MaLoaiSanPham')
        .populate('IdTepAnh')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
};

/**
 * Lấy sản phẩm theo loại
 */
SanPhamSchema.statics.findByCategory = function(categoryId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ MaLoaiSanPham: categoryId })
        .populate('MaLoaiSanPham')
        .populate('IdTepAnh')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
};

/**
 * Lấy sản phẩm có khuyến mãi
 */
SanPhamSchema.statics.getOnSale = function(options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ KhuyenMai: { $gt: 0 } })
        .populate('MaLoaiSanPham')
        .populate('IdTepAnh')
        .skip(skip)
        .limit(limit)
        .sort({ KhuyenMai: -1 });
};

/**
 * Lấy sản phẩm bán chạy
 */
SanPhamSchema.statics.getBestSellers = function(limit = 10) {
    return this.find({})
        .populate('MaLoaiSanPham')
        .populate('IdTepAnh')
        .sort({ DaBan: -1 })
        .limit(limit);
};

/**
 * Lấy sản phẩm mới nhất
 */
SanPhamSchema.statics.getLatest = function(limit = 10) {
    return this.find({})
        .populate('MaLoaiSanPham')
        .populate('IdTepAnh')
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Lấy với phân trang
 */
SanPhamSchema.statics.paginate = async function(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        this.find(filter)
            .populate('MaLoaiSanPham')
            .populate('IdTepAnh')
            .sort(sort)
            .skip(skip)
            .limit(limit),
        this.countDocuments(filter)
    ]);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('SanPham', SanPhamSchema);
