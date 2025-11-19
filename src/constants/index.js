// Constants - Các giá trị cố định trong hệ thống

// mã trạng thái HTTP
const HTTP_STATUS = {
    OK: 200,// thành công
    CREATED: 201,// tạo mới thành công
    BAD_REQUEST: 400,// lỗi yêu cầu
    UNAUTHORIZED: 401,// không được xác thực
    FORBIDDEN: 403,// không có quyền truy cập
    NOT_FOUND: 404,// không tìm thấy
    INTERNAL_SERVER_ERROR: 500,// lỗi server
};

// vai trò người dùng
const USER_ROLES = {
    ADMIN: 'admin',// quản trị viên
    CUSTOMER: 'customer',// khách hàng
    STAFF: 'staff',// nhân viên
};

// trạng thái đơn hàng
const ORDER_STATUS = {
    PENDING: 'pending',// chờ xử lý
    CONFIRMED: 'confirmed',// đã xác nhận
    PROCESSING: 'processing',// đang xử lý
    SHIPPING: 'shipping',// đang giao
    DELIVERED: 'delivered',// đã giao
    CANCELLED: 'cancelled',// đã hủy
};

// Payment Methods
const PAYMENT_METHODS = {
    COD: 'cod',// thanh toán khi nhận hàng
    BANK_TRANSFER: 'bank_transfer',// thanh toán qua ngân hàng
    VNPAY: 'vnpay',// thanh toán qua VNPAY
    MOMO: 'momo',// thanh toán qua MOMO
};

// trạng thái thanh toán
const PAYMENT_STATUS = { 
    PENDING: 'pending',// chờ thanh toán
    PAID: 'paid',// đã thanh toán
    FAILED: 'failed',// thất bại
    REFUNDED: 'refunded',// đã hoàn trả
};

// trạng thái sản phẩm
const PRODUCT_STATUS = {
    ACTIVE: 'active',// hoạt động
    INACTIVE: 'inactive',// không hoạt động
    OUT_OF_STOCK: 'out_of_stock',// hết hàng
};

// các thông báo API
const MESSAGES = {
    SUCCESS: 'Thành công',// thành công
    ERROR: 'Có lỗi xảy ra',// có lỗi xảy ra
    UNAUTHORIZED: 'Không có quyền truy cập',// không có quyền truy cập
    NOT_FOUND: 'Không tìm thấy',// không tìm thấy
    INVALID_CREDENTIALS: 'Thông tin đăng nhập không đúng',// thông tin đăng nhập không đúng
    USER_EXISTS: 'Email đã được sử dụng',// email đã được sử dụng
    USER_NOT_FOUND: 'Người dùng không tồn tại',// người dùng không tồn tại  
    PRODUCT_NOT_FOUND: 'Sản phẩm không tồn tại',// sản phẩm không tồn tại
    ORDER_NOT_FOUND: 'Đơn hàng không tồn tại',// đơn hàng không tồn tại
    CART_EMPTY: 'Giỏ hàng trống',// giỏ hàng trống
    INSUFFICIENT_STOCK: 'Không đủ hàng trong kho',// không đủ hàng trong kho
};

// phân trang
const PAGINATION = {
    DEFAULT_PAGE: 1,// trang mặc định
    DEFAULT_LIMIT: 10,// giới hạn mặc định
    MAX_LIMIT: 100,
};

// JWT (JSON Web Token)
const JWT = {
    ACCESS_TOKEN_EXPIRES: '1d',// token hết hạn 1 ngày
    REFRESH_TOKEN_EXPIRES: '1d',// token hết hạn 1 ngày
};

// tải lên file
const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB - 5MB     
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],// loại file cho phép
};

module.exports = {
    HTTP_STATUS,
    USER_ROLES,
    ORDER_STATUS,
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    PRODUCT_STATUS,
    MESSAGES,
    PAGINATION,
    JWT,
    FILE_UPLOAD,
};

