const TaiKhoan = require('../models/Taikhoan');
const { verifyToken } = require('../../utils/token');
const { errorResponse } = require('../../utils/response');
const { HTTP_STATUS, MESSAGES } = require('../../constants');


const authMiddleware = async (req, res, next) => {
    try {
            // Những API không yêu cầu đăng nhập
        const publicPaths = [
            '/auth/login',
            '/auth/register',
            '/auth/refresh-token',
            '/auth/forgot-password',
            '/auth/reset-password',
            '/api/supply-chain/lookup',
            '/payment/vnpay/return'
        ];
        
        // Public path patterns (regex) - áp dụng cho mọi method
        const publicPathPatterns = [
            /^\/api\/products(?:\/[^\/]+)?$/,               // Product listing & detail
            /^\/api\/categories(?:\/[^\/]+)?$/,             // Categories
            /^\/api\/reviews\/product\/[^\/]+(?:\/stats)?$/, // Reviews & stats
            /^\/api\/supply-chain\/products\/[^\/]+\/trace$/, // Supply chain trace details
            /^\/cart\/(add-to-cart|get-cart|update-cart|checkout)$/, // Cart operations for guests
            /^\/payment\/vnpay\/(create-payment-url|create-qr|return|ipn)$/ // VNPay guest checkout
        ];
        
        // Check exact paths
        if (publicPaths.includes(req.path)) {
            return next(); // bỏ qua middleware
        }
        
        // Check pattern paths
        for (const pattern of publicPathPatterns) {
            if (pattern.test(req.path)) {
                return next(); // bỏ qua middleware
            }
        }
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return errorResponse(res, 'Không có token', HTTP_STATUS.UNAUTHORIZED);
        }
        // Verify token using utility
        const decoded = verifyToken(token);
        if (!decoded) {
            if (req.cookies?.refreshToken) {
                res.clearCookie('refreshToken', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });
            }
            if (req.headers.authorization) {
                delete req.headers.authorization;
            }
            res.setHeader('Authorization', '');

            return errorResponse(res, 'Token không hợp lệ hoặc hết hạn', HTTP_STATUS.UNAUTHORIZED);
        }
        // Tìm user theo ID và populate role
        const user = await TaiKhoan.findById(decoded.id)
            .select('-MatKhau -DiaChi')
            .populate('MaVaiTro', 'TenVaiTro MoTa');
        if (!user) {
            return errorResponse(res, MESSAGES.USER_NOT_FOUND, HTTP_STATUS.UNAUTHORIZED);
        }
        // Kiểm tra tài khoản có active không
        if (user.TrangThai !== 'active') {
            return errorResponse(res, 'Tài khoản đã bị khóa', HTTP_STATUS.UNAUTHORIZED);
        }
        // Đảm bảo req.user có cả _id và id để tương thích với code
        req.user = user;
        // Thêm id từ decoded token hoặc _id để dễ sử dụng
        if (!req.user.id) {
            req.user.id = req.user._id?.toString() || decoded.id;
        }
        next();
    } catch (error) {
        if (req.cookies?.refreshToken) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
        }

        if (req.headers.authorization) {
            delete req.headers.authorization;
        }

        res.setHeader('Authorization', '');

        return errorResponse(res, 'Token không hợp lệ hoặc hết hạn', HTTP_STATUS.UNAUTHORIZED);
    }
}

module.exports = authMiddleware;