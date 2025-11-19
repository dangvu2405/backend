const mongoose = require('mongoose');

/**
 * ============================================
 * 📦 DONHANG SCHEMA (ORDER)
 * ============================================
 */
const DonHangSchema = new mongoose.Schema({
    MaKhachHang: {
        type: String,
        required: [true, 'Mã khách hàng là bắt buộc'],
        trim: true,
        minlength: [5, 'Mã khách hàng phải có ít nhất 10 ký tự'],
        maxlength: [50, 'Mã khách hàng không được quá 50 ký tự']
    },
    SanPham: {
        type: Array,
        required: [true, 'Sản phẩm là bắt buộc'],
        minlength: [1, 'Sản phẩm phải có ít nhất 1 sản phẩm'],
        maxlength: [1000, 'Sản phẩm không được quá 1000 sản phẩm']
    },
    TongTien: {
        type: Number,
        required: [true, 'Tổng tiền là bắt buộc'],
        min: [0, 'Tổng tiền không được âm']
    },
    DiaChi: {
        type: String,
        required: [true, 'Địa chỉ giao hàng là bắt buộc'],
        trim: true,
        minlength: [10, 'Địa chỉ phải có ít nhất 10 ký tự'],
        maxlength: [500, 'Địa chỉ không được quá 500 ký tự']
    },
    PhiVanChuyen: {
        type: Number,
        default: 0,
        min: [0, 'Phí vận chuyển không được âm']
    },
    PhuongThucThanhToan: {
        type: String,
        required: [true, 'Phương thức thanh toán là bắt buộc'],
        enum: {
            values: ['COD', 'VNPay', 'VNPayQR', 'BANK', 'CARD', 'MoMo', 'Chuyển khoản'],
            message: 'Phương thức thanh toán không hợp lệ'
        }
    },
    TrangThai: {
        type: String,
        enum: {
            values: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
            message: 'Trạng thái không hợp lệ'
        },
        default: 'pending'
    },
    GhiChu: {
        type: String,
        default: '',
        maxlength: [1000, 'Ghi chú không được quá 1000 ký tự']
    },
    TrangThaiThanhToan: {
        type: String,
        enum: {
            values: ['pending', 'paid', 'failed', 'refunded'],
            message: 'Trạng thái thanh toán không hợp lệ'
        },
        default: 'pending'
    },
    Voucher: {
        type: String,
        default: null
    },
    // VNPay fields
    VNPayTransactionRef: {
        type: String,
        default: null
    },
    VNPayCreateDate: {
        type: String,
        default: null
    },
    VNPayExpireDate: {
        type: String,
        default: null
    },
    VNPayResponseCode: {
        type: String,
        default: null
    },
    VNPayResponseMessage: {
        type: String,
        default: null
    },
    VNPayTransactionId: {
        type: String,
        default: null
    },
    VNPayBankCode: {
        type: String,
        default: null
    },
    VNPayPayDate: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    collection: 'DonHang'
});

// ============================================
// INDEXES
// ============================================

DonHangSchema.index({ TrangThai: 1 });
DonHangSchema.index({ PhuongThucThanhToan: 1 });
DonHangSchema.index({ createdAt: -1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

DonHangSchema.virtual('NgayDat').get(function() {
    return this.createdAt;
});

DonHangSchema.virtual('NgayCapNhat').get(function() {
    return this.updatedAt;
});

/**
 * Tổng cộng (Total + PhiVanChuyen)
 */
DonHangSchema.virtual('TongCong').get(function() {
    return this.Total + this.PhiVanChuyen;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Kiểm tra có thể hủy đơn không
 */
DonHangSchema.methods.canCancel = function() {
    return ['pending', 'confirmed'].includes(this.TrangThai);
};

/**
 * Hủy đơn hàng
 */
DonHangSchema.methods.cancel = async function(reason = '') {
    if (!this.canCancel()) {
        throw new Error('Không thể hủy đơn hàng ở trạng thái này');
    }
    
    this.TrangThai = 'cancelled';
    this.GhiChu = reason;
    return this.save();
};

/**
 * Cập nhật trạng thái
 */
DonHangSchema.methods.updateStatus = async function(status) {
    const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        throw new Error('Trạng thái không hợp lệ');
    }
    
    this.TrangThai = status;
    return this.save();
};

/**
 * Xác nhận đơn hàng
 */
DonHangSchema.methods.confirm = async function() {
    if (this.TrangThai !== 'pending') {
        throw new Error('Chỉ có thể xác nhận đơn hàng ở trạng thái pending');
    }
    
    this.TrangThai = 'confirmed';
    return this.save();
};

/**
 * Đánh dấu đang giao hàng
 */
DonHangSchema.methods.ship = async function() {
    if (this.TrangThai !== 'confirmed') {
        throw new Error('Chỉ có thể giao đơn hàng đã xác nhận');
    }
    
    this.TrangThai = 'shipping';
    return this.save();
};

/**
 * Hoàn thành đơn hàng
 */
DonHangSchema.methods.complete = async function() {
    if (this.TrangThai !== 'shipping') {
        throw new Error('Chỉ có thể hoàn thành đơn hàng đang giao');
    }
    
    this.TrangThai = 'delivered';
    return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Lấy đơn hàng theo trạng thái
 */
DonHangSchema.statics.findByStatus = function(status, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ TrangThai: status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Lấy đơn hàng theo phương thức thanh toán
 */
DonHangSchema.statics.findByPaymentMethod = function(method, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ PhuongThucThanhToan: method })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Lấy đơn hàng theo khoảng thời gian
 */
DonHangSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Tìm kiếm đơn hàng theo địa chỉ
 */
DonHangSchema.statics.searchByAddress = function(keyword, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({
        DiaChi: { $regex: keyword, $options: 'i' }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Đếm đơn hàng theo trạng thái
 */
DonHangSchema.statics.countByStatus = function(status) {
    return this.countDocuments({ TrangThai: status });
};

/**
 * Tính tổng doanh thu
 */
DonHangSchema.statics.getTotalRevenue = async function(filter = {}) {
    const result = await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                total: { $sum: '$Total' }
            }
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

/**
 * Tính doanh thu theo ngày
 */
DonHangSchema.statics.getRevenueByDate = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                TrangThai: { $ne: 'cancelled' }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                totalRevenue: { $sum: '$Total' },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

/**
 * Thống kê theo trạng thái
 */
DonHangSchema.statics.getStatisticsByStatus = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$TrangThai',
                count: { $sum: 1 },
                totalAmount: { $sum: '$Total' }
            }
        }
    ]);
};

/**
 * Thống kê theo phương thức thanh toán
 */
DonHangSchema.statics.getStatisticsByPaymentMethod = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$PhuongThucThanhToan',
                count: { $sum: 1 },
                totalAmount: { $sum: '$Total' }
            }
        }
    ]);
};

/**
 * Lấy với phân trang
 */
DonHangSchema.statics.paginate = async function(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        this.find(filter)
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

module.exports = mongoose.model('DonHang', DonHangSchema);
