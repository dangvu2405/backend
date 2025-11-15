const mongoose = require('mongoose');

/**
 * ============================================
 * 📁 LOAISANPHAM SCHEMA (CATEGORY)
 * ============================================
 */
const LoaiSanPhamSchema = new mongoose.Schema({
    TenLoaiSanPham: {
        type: String,
        required: [true, 'Tên loại sản phẩm là bắt buộc'],
        unique: true,
        trim: true,
        minlength: [2, 'Tên loại sản phẩm phải có ít nhất 2 ký tự'],
        maxlength: [100, 'Tên loại sản phẩm không được quá 100 ký tự']
    }
}, {
    timestamps: false,
    collection: 'LoaiSanPham'
});

// ============================================
// INDEXES
// ============================================
// Note: TenLoaiSanPham already has unique: true, which automatically creates an index
// No need to manually create index here

// ============================================
// STATIC METHODS
// ============================================

/**
 * Tìm loại sản phẩm theo tên
 */
LoaiSanPhamSchema.statics.findByName = function(name) {
    return this.findOne({ TenLoaiSanPham: name });
};

/**
 * Tìm kiếm loại sản phẩm
 */
LoaiSanPhamSchema.statics.search = function(keyword) {
    return this.find({
        TenLoaiSanPham: { $regex: keyword, $options: 'i' }
    });
};

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('LoaiSanPham', LoaiSanPhamSchema);
