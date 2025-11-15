const jwt = require('jsonwebtoken');
const TaiKhoan = require('../models/Taikhoan');

/**
 * Optional Auth Middleware
 * Nếu có token thì verify và set req.user, nếu không có thì vẫn tiếp tục
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            // Không có token, tiếp tục mà không set req.user
            return next();
        }

        try {
            const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
            const decoded = jwt.verify(token, jwtSecret);
            
            // Tìm user theo ID
            const user = await TaiKhoan.findById(decoded.id)
                .select('-MatKhau -DiaChi')
                .populate('MaVaiTro', 'TenVaiTro MoTa');
            
            if (user && user.TrangThai === 'active') {
                req.user = user;
            }
        } catch (jwtError) {
            // Token không hợp lệ, nhưng vẫn tiếp tục (optional auth)
            console.log('Optional auth: Invalid token, continuing without user');
        }
        
        next();
    } catch (error) {
        // Lỗi khác, vẫn tiếp tục
        next();
    }
}

module.exports = optionalAuthMiddleware;

