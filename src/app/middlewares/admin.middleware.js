/**
 * Admin Authorization Middleware
 * Kiểm tra xem user có quyền admin không
 * 
 * Phải đặt SAU authMiddleware để có req.user
 */

const adminMiddleware = async (req, res, next) => {
    try {
        // Kiểm tra user đã được authenticate chưa
        if (!req.user) {
            return res.status(401).json({ 
                message: 'Vui lòng đăng nhập để tiếp tục',
                required: 'Authentication required'
            });
        }

        // Lấy role của user (đã được populate từ authMiddleware)
        const userRole = req.user.MaVaiTro?.TenVaiTro || 
                        req.user.role || 
                        req.user.VaiTro;

        console.log('🔐 Admin check - User:', req.user.TenDangNhap || req.user.Email);
        console.log('🔐 Admin check - Role:', userRole);

        // Kiểm tra có phải admin không
        if (!userRole) {
            return res.status(403).json({ 
                message: 'Không thể xác định vai trò của bạn',
                required: 'Role not found'
            });
        }

        // Chấp nhận các role: Admin, admin, ADMIN, Quản trị viên
        const normalizedRole = userRole.toLowerCase().trim();
        const isAdmin = normalizedRole === 'admin' || 
                       normalizedRole === 'quản trị viên' ||
                       normalizedRole === 'administrator';

        if (!isAdmin) {
            console.log('❌ Access denied - Role:', userRole);
            return res.status(403).json({ 
                message: 'Bạn không có quyền truy cập. Yêu cầu quyền Admin.',
                currentRole: userRole,
                required: 'Admin role required'
            });
        }

        // User có quyền admin
        console.log('✅ Admin access granted');
        next();
    } catch (error) {
        console.error('❌ Admin middleware error:', error);
        return res.status(500).json({ 
            message: 'Lỗi kiểm tra quyền truy cập',
            error: error.message 
        });
    }
};

module.exports = adminMiddleware;

