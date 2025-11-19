const mongoose = require('mongoose');

/**
 * ============================================
 * 📋 PHIEUNHAP SCHEMA (GOODS RECEIPT)
 * ============================================
 */
const PhieuNhapSchema = new mongoose.Schema({
    MaNhaCungCap: {
        type: String,
        required: [true, 'Mã nhà cung cấp là bắt buộc'],
        trim: true,
        minlength: [3, 'Mã nhà cung cấp phải có ít nhất 3 ký tú'],
        maxlength: [100, 'Mã nhà cung cấp không được quá 100 ký tự']
    },
    TenNhaCungCap: {
        type: String,
        required: [true, 'Tên nhà cung cấp là bắt buộc'],
        trim: true,
        minlength: [2, 'Tên nhà cung cấp phải có ít nhất 2 ký tự'],
        maxlength: [200, 'Tên nhà cung cấp không được quá 200 ký tự']
    },
    SanPham: [{
        MaSanPham: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SanPham',
            required: [true, 'Mã sản phẩm là bắt buộc']
        },
        TenSanPham: {
            type: String,
            required: [true, 'Tên sản phẩm là bắt buộc']
        },
        SoLuong: {
            type: Number,
            required: [true, 'Số lượng là bắt buộc'],
            min: [1, 'Số lượng phải lớn hơn 0']
        },
        GiaNhap: {
            type: Number,
            required: [true, 'Giá nhập là bắt buộc'],
            min: [0, 'Giá nhập không được âm']
        },
        ThanhTien: {
            type: Number,
            required: [true, 'Thành tiền là bắt buộc'],
            min: [0, 'Thành tiền không được âm']
        }
    }],
    TongTien: {
        type: Number,
        required: [true, 'Tổng tiền là bắt buộc'],
        min: [0, 'Tổng tiền không được âm']
    },
    MaNguoiNhap: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaiKhoan',
        required: [true, 'Người nhập là bắt buộc']
    },
    TrangThai: {
        type: String,
        enum: {
            values: ['pending', 'approved', 'received', 'cancelled'],
            message: 'Trạng thái không hợp lệ'
        },
        default: 'pending'
    },
    NgayNhap: {
        type: Date,
        default: Date.now
    },
    GhiChu: {
        type: String,
        default: '',
        maxlength: [1000, 'Ghi chú không được quá 1000 ký tự']
    }
}, {
    timestamps: true,
    collection: 'PhieuNhap'
});

// ============================================
// INDEXES
// ============================================

PhieuNhapSchema.index({ MaNhaCungCap: 1 });
PhieuNhapSchema.index({ TrangThai: 1 });
PhieuNhapSchema.index({ NgayNhap: -1 });
PhieuNhapSchema.index({ MaNguoiNhap: 1 });
PhieuNhapSchema.index({ createdAt: -1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

PhieuNhapSchema.virtual('NgayTao').get(function() {
    return this.createdAt;
});

PhieuNhapSchema.virtual('NgayCapNhat').get(function() {
    return this.updatedAt;
});

/**
 * Tổng số lượng sản phẩm
 */
PhieuNhapSchema.virtual('TongSoLuong').get(function() {
    return this.SanPham.reduce((total, item) => total + item.SoLuong, 0);
});

// ============================================
// PRE SAVE HOOKS
// ============================================

/**
 * Tự động tính tổng tiền trước khi lưu
 */
PhieuNhapSchema.pre('save', function(next) {
    if (this.SanPham && this.SanPham.length > 0) {
        this.TongTien = this.SanPham.reduce((total, item) => {
            item.ThanhTien = item.SoLuong * item.GiaNhap;
            return total + item.ThanhTien;
        }, 0);
    }
    next();
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Kiểm tra có thể hủy phiếu nhập không
 */
PhieuNhapSchema.methods.canCancel = function() {
    return ['pending', 'approved'].includes(this.TrangThai);
};

/**
 * Hủy phiếu nhập
 */
PhieuNhapSchema.methods.cancel = async function(reason = '') {
    if (!this.canCancel()) {
        throw new Error('Không thể hủy phiếu nhập ở trạng thái này');
    }
    
    this.TrangThai = 'cancelled';
    this.GhiChu = reason;
    return this.save();
};

/**
 * Duyệt phiếu nhập
 */
PhieuNhapSchema.methods.approve = async function() {
    if (this.TrangThai !== 'pending') {
        throw new Error('Chỉ có thể duyệt phiếu nhập ở trạng thái pending');
    }
    
    this.TrangThai = 'approved';
    return this.save();
};

/**
 * Xác nhận đã nhận hàng
 */
PhieuNhapSchema.methods.receive = async function() {
    if (this.TrangThai !== 'approved') {
        throw new Error('Chỉ có thể nhận hàng khi phiếu đã được duyệt');
    }
    
    this.TrangThai = 'received';
    
    // Cập nhật số lượng sản phẩm trong kho
    const SanPham = require('./SanPham');
    
    for (const item of this.SanPham) {
        const product = await SanPham.findById(item.MaSanPham);
        if (product) {
            await product.increaseStock(item.SoLuong);
        }
    }
    
    return this.save();
};

/**
 * Cập nhật trạng thái
 */
PhieuNhapSchema.methods.updateStatus = async function(status) {
    const validStatuses = ['pending', 'approved', 'received', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        throw new Error('Trạng thái không hợp lệ');
    }
    
    this.TrangThai = status;
    return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Tìm phiếu nhập theo nhà cung cấp
 */
PhieuNhapSchema.statics.findBySupplier = function(supplierId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ MaNhaCungCap: supplierId })
        .populate('MaNguoiNhap', 'TenDangNhap Email HoTen')
        .populate('SanPham.MaSanPham')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Tìm phiếu nhập theo trạng thái
 */
PhieuNhapSchema.statics.findByStatus = function(status, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ TrangThai: status })
        .populate('MaNguoiNhap', 'TenDangNhap Email HoTen')
        .populate('SanPham.MaSanPham')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Tìm phiếu nhập theo khoảng thời gian
 */
PhieuNhapSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({
        NgayNhap: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    })
    .populate('MaNguoiNhap', 'TenDangNhap Email HoTen')
    .populate('SanPham.MaSanPham')
    .sort({ NgayNhap: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Thống kê theo nhà cung cấp
 */
PhieuNhapSchema.statics.getStatisticsBySupplier = function() {
    return this.aggregate([
        {
            $match: { TrangThai: 'received' }
        },
        {
            $group: {
                _id: '$MaNhaCungCap',
                tenNhaCungCap: { $first: '$TenNhaCungCap' },
                soPhieu: { $sum: 1 },
                tongTien: { $sum: '$TongTien' }
            }
        },
        { $sort: { tongTien: -1 } }
    ]);
};

/**
 * Thống kê theo tháng
 */
PhieuNhapSchema.statics.getStatisticsByMonth = function(year) {
    return this.aggregate([
        {
            $match: {
                TrangThai: 'received',
                NgayNhap: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$NgayNhap' },
                soPhieu: { $sum: 1 },
                tongTien: { $sum: '$TongTien' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

/**
 * Tổng giá trị nhập hàng
 */
PhieuNhapSchema.statics.getTotalValue = async function(filter = {}) {
    const result = await this.aggregate([
        { $match: { ...filter, TrangThai: 'received' } },
        {
            $group: {
                _id: null,
                total: { $sum: '$TongTien' }
            }
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

/**
 * Lấy với phân trang
 */
PhieuNhapSchema.statics.paginate = async function(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        this.find(filter)
            .populate('MaNguoiNhap', 'TenDangNhap Email HoTen')
            .populate('SanPham.MaSanPham')
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

module.exports = mongoose.model('PhieuNhap', PhieuNhapSchema);

