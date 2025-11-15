/**
 * Role-based Authorization Middleware Factory
 * Tạo middleware để kiểm tra nhiều roles khác nhau
 * 
 * Usage:
 * router.get('/admin/path', requireRole('Admin'));
 * router.get('/manager/path', requireRole(['Admin', 'Manager']));
 */

/**
 * Kiểm tra user có một trong các roles được chỉ định không
 * @param {string|string[]} allowedRoles - Role hoặc danh sách roles được phép
 * @returns {Function} Express middleware
 */
const requireRole = (allowedRoles) => {
    // Normalize về array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Normalize tất cả roles về lowercase để so sánh
    const normalizedAllowedRoles = roles.map(role => role.toLowerCase().trim());

    return async (req, res, next) => {
        try {
            // Kiểm tra user đã được authenticate chưa
            if (!req.user) {
                return res.status(401).json({ 
                    message: 'Vui lòng đăng nhập để tiếp tục',
                    required: 'Authentication required'
                });
            }

            // Lấy role của user
            const userRole = req.user.MaVaiTro?.TenVaiTro || 
                            req.user.role || 
                            req.user.VaiTro;

            console.log(`🔐 Role check - User: ${req.user.TenDangNhap || req.user.Email}, Role: ${userRole}`);

            if (!userRole) {
                return res.status(403).json({ 
                    message: 'Không thể xác định vai trò của bạn',
                    required: 'Role not found'
                });
            }

            // Normalize user role
            const normalizedUserRole = userRole.toLowerCase().trim();

            // Kiểm tra user có role được phép không
            const hasPermission = normalizedAllowedRoles.includes(normalizedUserRole);

            if (!hasPermission) {
                console.log(`❌ Access denied - User role: ${userRole}, Required: ${roles.join(', ')}`);
                return res.status(403).json({ 
                    message: `Bạn không có quyền truy cập. Yêu cầu một trong các vai trò: ${roles.join(', ')}`,
                    currentRole: userRole,
                    requiredRoles: roles
                });
            }

            // User có quyền
            console.log(`✅ Access granted - Role: ${userRole}`);
            next();
        } catch (error) {
            console.error('❌ Role middleware error:', error);
            return res.status(500).json({ 
                message: 'Lỗi kiểm tra quyền truy cập',
                error: error.message 
            });
        }
    };
};

/**
 * Shorthand middleware cho Admin
 */
const requireAdmin = () => requireRole(['Admin', 'Quản trị viên', 'Administrator']);

/**
 * Shorthand middleware cho Manager
 */
const requireManager = () => requireRole(['Admin', 'Manager', 'Quản lý']);

/**
 * Shorthand middleware cho Staff (nhân viên)
 */
const requireStaff = () => requireRole(['Admin', 'Manager', 'Staff', 'Nhân viên']);

module.exports = {
    requireRole,
    requireAdmin,
    requireManager,
    requireStaff
};

