const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * ============================================
 * 👤 TAIKHOAN SCHEMA (USER)
 * ============================================
 */
const TaikhoanSchema = new mongoose.Schema({
    TenDangNhap: {
        type: String,
        required: [true, 'Tên tài khoản là bắt buộc'],
        unique: true,
        trim: true,
        minlength: [3, 'Tên tài khoản phải có ít nhất 3 ký tự'],
        maxlength: [50, 'Tên tài khoản không được quá 50 ký tự']
    },
    MatKhau: {
        type: String,
        required: function() {
            // Mật khẩu không bắt buộc nếu đăng nhập bằng OAuth
            return !this.facebook && !this.google;
        },
        minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
    },
    HoTen: {
        type: String,
        required: [true, 'Họ tên là bắt buộc'],
        trim: true,
        minlength: [2, 'Họ tên phải có ít nhất 2 ký tự'],
        maxlength: [100, 'Họ tên không được quá 100 ký tự']
    },
    Email: {
        type: String,
        required: [true, 'Email là bắt buộc'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    TrangThai: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    MaVaiTro: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: [true, 'Vai trò là bắt buộc']
    },
    AvatarId: {
        type: String,
        default: null
    },
    AvatarUrl: {
        type: String,
        default: null
    },
    NgaySinh: {
        type: Date,
        default: null
    },
    GioiTinh: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: null
    },
    SoDienThoai: {
        type: String,
        required: function() {
            // Số điện thoại không bắt buộc nếu đăng nhập bằng OAuth
            return !this.facebook && !this.google;
        },
        trim: true,
        match: [/^[0-9]{10}$/, 'Số điện thoại phải có 10 chữ số']
    },
    facebook: {
        id: {
            type: String,
            sparse: true,
            unique: true
        },
        accessToken: {
            type: String
        }
    },
    google: {
        id: {
            type: String,
            sparse: true,
            unique: true
        },
        accessToken: {
            type: String
        }
    },
    DiaChi: {
        type: [{
            HoTen: {
                type: String,
                required: [true, 'Họ tên người nhận là bắt buộc'],
                trim: true
            },
            SoDienThoai: {
                type: String,
                required: [true, 'Số điện thoại là bắt buộc'],
                trim: true,
                match: [/^[0-9]{10}$/, 'Số điện thoại phải có 10 chữ số']
            },
            DiaChiChiTiet: {
                type: String,
                required: [true, 'Địa chỉ chi tiết là bắt buộc'],
                trim: true
            },
            PhuongXa: {
                type: String,
                trim: true,
                default: ''
            },
            QuanHuyen: {
                type: String,
                required: [true, 'Quận/Huyện là bắt buộc'],
                trim: true
            },
            TinhThanh: {
                type: String,
                required: [true, 'Tỉnh/Thành phố là bắt buộc'],
                trim: true
            },
            MacDinh: {
                type: Boolean,
                default: false
            }
        }],
        validate: {
            validator: function(addresses) {
                return addresses.length <= 5;
            },
            message: 'Không thể thêm quá 5 địa chỉ'
        },
        default: []
    }
}, {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    collection: 'Taikhoan'
});

// ============================================
// INDEXES
// ============================================

// Email và TenDangNhap đã có unique: true nên không cần khai báo index lại
// Chỉ cần index cho MaVaiTro để tối ưu query
TaikhoanSchema.index({ MaVaiTro: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Đổi tên createdAt và updatedAt
TaikhoanSchema.virtual('NgayTao').get(function() {
    return this.createdAt;
});

TaikhoanSchema.virtual('NgayCapNhat').get(function() {
    return this.updatedAt;
});

module.exports = mongoose.model('Taikhoan', TaikhoanSchema);
