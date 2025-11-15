const mongoose = require('mongoose');

/**
 * ============================================
 * 📝 LICHSUDANGNHAP SCHEMA (LOGIN HISTORY)
 * ============================================
 */
const LichSuDangNhapSchema = new mongoose.Schema({
    MaTaiKhoan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taikhoan',
        required: [true, 'ID tài khoản là bắt buộc']
    },
    DiaChiIP: {
        type: String,
        required: [true, 'Địa chỉ IP là bắt buộc'],
        trim: true
    },
    ThietBi: {
        type: String,
        default: 'unknown',
        trim: true
    },
    TrinhDuyet: {
        type: String,
        default: 'unknown',
        trim: true
    },
    TrangThai: {
        type: String,
        enum: {
            values: ['success', 'failed'],
            message: 'Trạng thái không hợp lệ'
        },
        default: 'success'
    },
    ThongTinThem: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    collection: 'LichSuDangNhap'
});

// ============================================
// INDEXES
// ============================================

LichSuDangNhapSchema.index({ MaTaiKhoan: 1 });
LichSuDangNhapSchema.index({ TrangThai: 1 });
LichSuDangNhapSchema.index({ createdAt: -1 });
LichSuDangNhapSchema.index({ DiaChiIP: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

LichSuDangNhapSchema.virtual('NgayDangNhap').get(function() {
    return this.createdAt;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Kiểm tra đăng nhập thành công không
 */
LichSuDangNhapSchema.methods.isSuccessful = function() {
    return this.TrangThai === 'success';
};

/**
 * Kiểm tra đăng nhập thất bại không
 */
LichSuDangNhapSchema.methods.isFailed = function() {
    return this.TrangThai === 'failed';
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Log đăng nhập thành công
 */
LichSuDangNhapSchema.statics.logSuccessfulLogin = async function(userId, ip, userAgent, additionalInfo = {}) {
    try {
        return await this.create({
            MaTaiKhoan: userId,
            DiaChiIP: ip,
            ThietBi: additionalInfo.device || 'unknown',
            TrinhDuyet: userAgent || 'unknown',
            TrangThai: 'success',
            ThongTinThem: additionalInfo
        });
    } catch (error) {
        console.error('❌ Error logging successful login:', error);
        throw error;
    }
};

/**
 * Log đăng nhập thất bại
 */
LichSuDangNhapSchema.statics.logFailedLogin = async function(userId, ip, userAgent, reason = '', additionalInfo = {}) {
    try {
        return await this.create({
            MaTaiKhoan: userId,
            DiaChiIP: ip,
            ThietBi: additionalInfo.device || 'unknown',
            TrinhDuyet: userAgent || 'unknown',
            TrangThai: 'failed',
            ThongTinThem: {
                reason,
                ...additionalInfo
            }
        });
    } catch (error) {
        console.error('❌ Error logging failed login:', error);
        throw error;
    }
};

/**
 * Lấy lịch sử đăng nhập theo user
 */
LichSuDangNhapSchema.statics.findByUser = function(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({ MaTaiKhoan: userId })
        .populate('MaTaiKhoan', 'HoTen Email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Lấy đăng nhập thành công của user
 */
LichSuDangNhapSchema.statics.getSuccessfulLogins = function(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({
        MaTaiKhoan: userId,
        TrangThai: 'success'
    })
    .populate('MaTaiKhoan', 'HoTen Email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Lấy đăng nhập thất bại của user
 */
LichSuDangNhapSchema.statics.getFailedLogins = function(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({
        MaTaiKhoan: userId,
        TrangThai: 'failed'
    })
    .populate('MaTaiKhoan', 'HoTen Email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Lấy lịch sử đăng nhập gần đây
 */
LichSuDangNhapSchema.statics.getRecentLogins = function(userId, limit = 10) {
    return this.find({ MaTaiKhoan: userId })
        .populate('MaTaiKhoan', 'HoTen Email')
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Lấy theo khoảng thời gian
 */
LichSuDangNhapSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return this.find({
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    })
    .populate('MaTaiKhoan', 'HoTen Email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Đếm đăng nhập hôm nay
 */
LichSuDangNhapSchema.statics.countTodayLogins = async function() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return await this.countDocuments({
            createdAt: {
                $gte: today,
                $lt: tomorrow
            },
            TrangThai: 'success'
        });
    } catch (error) {
        console.error('Error counting today logins:', error);
        return 0;
    }
};

/**
 * Đếm đăng nhập theo khoảng thời gian
 */
LichSuDangNhapSchema.statics.countLoginsByDateRange = async function(startDate, endDate, filter = {}) {
    try {
        return await this.countDocuments({
            ...filter,
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        });
    } catch (error) {
        console.error('Error counting logins by date range:', error);
        return 0;
    }
};

/**
 * Đếm đăng nhập thành công
 */
LichSuDangNhapSchema.statics.countSuccessfulLogins = async function(filter = {}) {
    try {
        return await this.countDocuments({
            ...filter,
            TrangThai: 'success'
        });
    } catch (error) {
        console.error('Error counting successful logins:', error);
        return 0;
    }
};

/**
 * Đếm đăng nhập thất bại
 */
LichSuDangNhapSchema.statics.countFailedLogins = async function(filter = {}) {
    try {
        return await this.countDocuments({
            ...filter,
            TrangThai: 'failed'
        });
    } catch (error) {
        console.error('Error counting failed logins:', error);
        return 0;
    }
};

/**
 * Thống kê đăng nhập của user
 */
LichSuDangNhapSchema.statics.getLoginStatistics = async function(userId) {
    try {
        return await this.aggregate([
            { $match: { MaTaiKhoan: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: '$TrangThai',
                    count: { $sum: 1 }
                }
            }
        ]);
    } catch (error) {
        console.error('Error getting login statistics:', error);
        return [];
    }
};

/**
 * Thống kê đăng nhập theo ngày
 */
LichSuDangNhapSchema.statics.getLoginsByDate = async function(startDate, endDate) {
    try {
        return await this.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    totalLogins: { $sum: 1 },
                    successfulLogins: {
                        $sum: { $cond: [{ $eq: ['$TrangThai', 'success'] }, 1, 0] }
                    },
                    failedLogins: {
                        $sum: { $cond: [{ $eq: ['$TrangThai', 'failed'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);
    } catch (error) {
        console.error('Error getting logins by date:', error);
        return [];
    }
};

/**
 * Thống kê theo IP
 */
LichSuDangNhapSchema.statics.getLoginsByIP = async function(userId = null) {
    try {
        const match = userId ? { MaTaiKhoan: new mongoose.Types.ObjectId(userId) } : {};
        
        return await this.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$DiaChiIP',
                    count: { $sum: 1 },
                    lastLogin: { $max: '$createdAt' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);
    } catch (error) {
        console.error('Error getting logins by IP:', error);
        return [];
    }
};

/**
 * Xóa log cũ
 */
LichSuDangNhapSchema.statics.deleteOldLogs = async function(days = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await this.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        return result.deletedCount;
    } catch (error) {
        console.error('Error deleting old logs:', error);
        throw error;
    }
};

/**
 * Lấy với phân trang
 */
LichSuDangNhapSchema.statics.paginate = async function(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        this.find(filter)
            .populate('MaTaiKhoan', 'HoTen Email TenTaiKhoan')
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

/**
 * Phát hiện đăng nhập đáng ngờ (nhiều lần thất bại)
 */
LichSuDangNhapSchema.statics.detectSuspiciousLogins = async function(userId, minutes = 30, threshold = 5) {
    try {
        const timeAgo = new Date(Date.now() - minutes * 60 * 1000);
        
        const failedCount = await this.countDocuments({
            MaTaiKhoan: userId,
            TrangThai: 'failed',
            createdAt: { $gte: timeAgo }
        });

        return failedCount >= threshold;
    } catch (error) {
        console.error('Error detecting suspicious logins:', error);
        return false;
    }
};

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('LichSuDangNhap', LichSuDangNhapSchema);
