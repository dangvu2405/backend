const mongoose = require('mongoose');

/**
 * ============================================
 * 🎭 ROLE SCHEMA
 * ============================================
 */
const RoleSchema = new mongoose.Schema({
    TenVaiTro: {
        type: String,
        required: [true, 'Tên vai trò là bắt buộc'],
        unique: true,
        trim: true,
        enum: {
            values: ['Admin', 'Customer', 'Staff'],
            message: 'Vai trò không hợp lệ'
        }
    }
}, {
    timestamps: false,
    collection: 'Role'
});

// ============================================
// INDEXES
// ============================================

// TenVaiTro đã có unique: true nên không cần khai báo index lại

// ============================================
// STATIC METHODS
// ============================================

/**
 * Tìm role theo tên
 */
RoleSchema.statics.findByName = function(name) {
    return this.findOne({ TenVaiTro: name });
};

/**
 * Lấy role Admin
 */
RoleSchema.statics.getAdminRole = function() {
    return this.findOne({ TenVaiTro: 'Admin' });
};

/**
 * Lấy role Customer
 */
RoleSchema.statics.getCustomerRole = function() {
    return this.findOne({ TenVaiTro: 'Customer' });
};

/**
 * Lấy role Staff
 */
RoleSchema.statics.getStaffRole = function() {
    return this.findOne({ TenVaiTro: 'Staff' });
};

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('Role', RoleSchema);
