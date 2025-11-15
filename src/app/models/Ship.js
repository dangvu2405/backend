const mongoose = require('mongoose');

/**
 * ============================================
 * 🚚 SHIP SCHEMA (SHIPPING)
 * ============================================
 */
const ShipSchema = new mongoose.Schema({
    MaDonHang: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DonHang',
        required: [true, 'Mã đơn hàng là bắt buộc'],
        unique: true
    },
    DonViVanChuyen: {
        type: String,
        required: [true, 'Đơn vị vận chuyển là bắt buộc'],
        enum: {
            values: ['Giao Hàng Nhanh', 'Giao Hàng Tiết Kiệm', 'J&T Express', 'Viettel Post', 'VNPost', 'Ninja Van', 'Shopee Express', 'Grab Express'],
            message: 'Đơn vị vận chuyển không hợp lệ'
        }
    },
    MaVanDon: {
        type: String,
        required: [true, 'Mã vận đơn là bắt buộc'],
        unique: true,
        trim: true,
        minlength: [5, 'Mã vận đơn phải có ít nhất 5 ký tự'],
        maxlength: [50, 'Mã vận đơn không được quá 50 ký tự']
    },
    PhiShip: {
        type: Number,
        required: [true, 'Phí ship là bắt buộc'],
        min: [0, 'Phí ship không được âm'],
        default: 0
    },
    TrangThai: {
        type: String,
        enum: {
            values: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
            message: 'Trạng thái không hợp lệ'
        },
        default: 'pending'
    },
    NguoiGiao: {
        HoTen: {
            type: String,
            default: '',
            trim: true,
            maxlength: [100, 'Họ tên không được quá 100 ký tự']
        },
        SoDienThoai: {
            type: String,
            default: '',
            trim: true,
            match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
        }
    },
    DiaChiGiao: {
        type: String,
        required: [true, 'Địa chỉ giao hàng là bắt buộc'],
        trim: true,
        minlength: [10, 'Địa chỉ phải có ít nhất 10 ký tự'],
        maxlength: [500, 'Địa chỉ không được quá 500 ký tự']
    },
    NguoiNhan: {
        HoTen: {
            type: String,
            required: [true, 'Tên người nhận là bắt buộc'],
            trim: true,
            maxlength: [100, 'Họ tên không được quá 100 ký tự']
        },
        SoDienThoai: {
            type: String,
            required: [true, 'Số điện thoại người nhận là bắt buộc'],
            trim: true,
            match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
        }
    },
    ThoiGianLayHang: {
        type: Date,
        default: null
    },
    ThoiGianGiaoDuKien: {
        type: Date,
        default: null
    },
    ThoiGianGiaoThucTe: {
        type: Date,
        default: null
    },
    LichSuTrangThai: [{
        TrangThai: {
            type: String,
            required: true
        },
        MoTa: {
            type: String,
            default: ''
        },
        ThoiGian: {
            type: Date,
            default: Date.now
        },
        DiaDiem: {
            type: String,
            default: ''
        }
    }],
    GhiChu: {
        type: String,
        default: '',
        maxlength: [1000, 'Ghi chú không được quá 1000 ký tự']
    },
    LyDoThatBai: {
        type: String,
        default: '',
        maxlength: [500, 'Lý do thất bại không được quá 500 ký tự']
    }
}, {
    timestamps: true,
    collection: 'Ship'
});

// ============================================
// INDEXES
// ============================================

ShipSchema.index({ TrangThai: 1 });
ShipSchema.index({ DonViVanChuyen: 1 });
ShipSchema.index({ createdAt: -1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

ShipSchema.virtual('NgayTao').get(function() {
    return this.createdAt;
});

ShipSchema.virtual('NgayCapNhat').get(function() {
    return this.updatedAt;
});

/**
 * Thời gian giao hàng (phút)
 */
ShipSchema.virtual('ThoiGianGiaoHang').get(function() {
    if (this.ThoiGianGiaoThucTe && this.ThoiGianLayHang) {
        return Math.floor((this.ThoiGianGiaoThucTe - this.ThoiGianLayHang) / (1000 * 60));
    }
    return null;
});

/**
 * Đã giao hàng thành công chưa
 */
ShipSchema.virtual('DaGiaoHang').get(function() {
    return this.TrangThai === 'delivered';
});

/**
 * Đang trong quá trình vận chuyển
 */
ShipSchema.virtual('DangVanChuyen').get(function() {
    return ['picked_up', 'in_transit', 'out_for_delivery'].includes(this.TrangThai);
});

// ============================================
// PRE SAVE HOOKS
// ============================================

/**
 * Tự động thêm lịch sử trạng thái khi thay đổi
 */
ShipSchema.pre('save', function(next) {
    if (this.isModified('TrangThai')) {
        const statusDescriptions = {
            'pending': 'Đang chờ lấy hàng',
            'picked_up': 'Đã lấy hàng',
            'in_transit': 'Đang vận chuyển',
            'out_for_delivery': 'Đang giao hàng',
            'delivered': 'Đã giao hàng thành công',
            'failed': 'Giao hàng thất bại',
            'returned': 'Đã hoàn trả'
        };

        this.LichSuTrangThai.push({
            TrangThai: this.TrangThai,
            MoTa: statusDescriptions[this.TrangThai] || '',
            ThoiGian: new Date()
        });

        // Cập nhật thời gian tương ứng
        if (this.TrangThai === 'picked_up' && !this.ThoiGianLayHang) {
            this.ThoiGianLayHang = new Date();
        }
        
        if (this.TrangThai === 'delivered' && !this.ThoiGianGiaoThucTe) {
            this.ThoiGianGiaoThucTe = new Date();
        }
    }
    next();
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Cập nhật trạng thái
 */
ShipSchema.methods.updateStatus = async function(status, description = '', location = '') {
    const validStatuses = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'];
    
    if (!validStatuses.includes(status)) {
        throw new Error('Trạng thái không hợp lệ');
    }
    
    this.TrangThai = status;
    
    // Thêm vào lịch sử (pre save hook sẽ tự động thêm)
    if (description || location) {
        this.LichSuTrangThai.push({
            TrangThai: status,
            MoTa: description,
            ThoiGian: new Date(),
            DiaDiem: location
        });
    }
    
    return this.save();
};

/**
 * Đánh dấu đã lấy hàng
 */
ShipSchema.methods.pickup = async function() {
    if (this.TrangThai !== 'pending') {
        throw new Error('Chỉ có thể lấy hàng ở trạng thái pending');
    }
    
    this.TrangThai = 'picked_up';
    this.ThoiGianLayHang = new Date();
    return this.save();
};

/**
 * Đánh dấu đang vận chuyển
 */
ShipSchema.methods.transit = async function() {
    if (this.TrangThai !== 'picked_up') {
        throw new Error('Chỉ có thể vận chuyển sau khi đã lấy hàng');
    }
    
    this.TrangThai = 'in_transit';
    return this.save();
};

/**
 * Đánh dấu đang giao hàng
 */
ShipSchema.methods.outForDelivery = async function() {
    if (!['picked_up', 'in_transit'].includes(this.TrangThai)) {
        throw new Error('Không thể chuyển sang trạng thái đang giao hàng');
    }
    
    this.TrangThai = 'out_for_delivery';
    return this.save();
};

/**
 * Hoàn thành giao hàng
 */
ShipSchema.methods.deliver = async function() {
    if (this.TrangThai !== 'out_for_delivery') {
        throw new Error('Chỉ có thể hoàn thành khi đang giao hàng');
    }
    
    this.TrangThai = 'delivered';
    this.ThoiGianGiaoThucTe = new Date();
    
    // Cập nhật trạng thái đơn hàng
    const DonHang = require('./DonHang');
    const order = await DonHang.findById(this.MaDonHang);
    if (order) {
        await order.complete();
    }
    
    return this.save();
};

/**
 * Đánh dấu giao hàng thất bại
 */
ShipSchema.methods.fail = async function(reason = '') {
    if (!['out_for_delivery', 'in_transit'].includes(this.TrangThai)) {
        throw new Error('Không thể đánh dấu thất bại ở trạng thái này');
    }
    
    this.TrangThai = 'failed';
    this.LyDoThatBai = reason;
    return this.save();
};

/**
 * Hoàn trả hàng
 */
ShipSchema.methods.return = async function(reason = '') {
    if (!['failed', 'out_for_delivery'].includes(this.TrangThai)) {
        throw new Error('Không thể hoàn trả ở trạng thái này');
    }
    
    this.TrangThai = 'returned';
    this.LyDoThatBai = reason;
    return this.save();
};

/**
 * Thêm lịch sử trạng thái
 */
ShipSchema.methods.addStatusHistory = function(status, description = '', location = '') {
    this.LichSuTrangThai.push({
        TrangThai: status,
        MoTa: description,
        ThoiGian: new Date(),
        DiaDiem: location
    });
    return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Tìm theo mã đơn hàng
 */
ShipSchema.statics.findByOrder = function(orderId) {
    return this.findOne({ MaDonHang: orderId })
        .populate('MaDonHang');
};

/**
 * Tìm theo mã vận đơn
 */
ShipSchema.statics.findByTrackingCode = function(trackingCode) {
    return this.findOne({ MaVanDon: trackingCode })
        .populate('MaDonHang');
};

/**
 * Tìm theo trạng thái
 */
ShipSchema.statics.findByStatus = function(status, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ TrangThai: status })
        .populate('MaDonHang')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Tìm theo đơn vị vận chuyển
 */
ShipSchema.statics.findByShipper = function(shipper, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ DonViVanChuyen: shipper })
        .populate('MaDonHang')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Thống kê theo trạng thái
 */
ShipSchema.statics.getStatisticsByStatus = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$TrangThai',
                count: { $sum: 1 },
                totalFee: { $sum: '$PhiShip' }
            }
        }
    ]);
};

/**
 * Thống kê theo đơn vị vận chuyển
 */
ShipSchema.statics.getStatisticsByShipper = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$DonViVanChuyen',
                count: { $sum: 1 },
                totalFee: { $sum: '$PhiShip' },
                delivered: {
                    $sum: { $cond: [{ $eq: ['$TrangThai', 'delivered'] }, 1, 0] }
                },
                failed: {
                    $sum: { $cond: [{ $eq: ['$TrangThai', 'failed'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                _id: 1,
                count: 1,
                totalFee: 1,
                delivered: 1,
                failed: 1,
                successRate: {
                    $multiply: [
                        { $divide: ['$delivered', '$count'] },
                        100
                    ]
                }
            }
        }
    ]);
};

/**
 * Thống kê thời gian giao hàng trung bình
 */
ShipSchema.statics.getAverageDeliveryTime = async function() {
    const result = await this.aggregate([
        {
            $match: { 
                TrangThai: 'delivered',
                ThoiGianLayHang: { $exists: true },
                ThoiGianGiaoThucTe: { $exists: true }
            }
        },
        {
            $project: {
                deliveryTime: {
                    $divide: [
                        { $subtract: ['$ThoiGianGiaoThucTe', '$ThoiGianLayHang'] },
                        1000 * 60 * 60 // Convert to hours
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                avgTime: { $avg: '$deliveryTime' }
            }
        }
    ]);

    return result.length > 0 ? result[0].avgTime : 0;
};

/**
 * Lấy với phân trang
 */
ShipSchema.statics.paginate = async function(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        this.find(filter)
            .populate('MaDonHang')
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

module.exports = mongoose.model('Ship', ShipSchema);
