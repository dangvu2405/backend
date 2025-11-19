const mongoose = require('mongoose');
const SanPhamController = require('./SanPhamController');
const LoaiSanPhamController = require('./LoaiSanPhamController');
const RoleController = require('./RoleController');
const TaiKhoanController = require('./TaiKhoanController');
const DonHangController = require('./DonHangController');
const GioHangController = require('./GioHangController');
const KhoController = require('./KhoController');
const SanPham = require('../models/SanPham');
const LoaiSanPham = require('../models/LoaiSanPham');
const Role = require('../models/Role');
const TaiKhoan = require('../models/Taikhoan');
const DonHang = require('../models/DonHang');

class AdminController {
    // ==========================
    // PRODUCT MANAGEMENT
    // ==========================
    async createProduct(req, res) {
        return SanPhamController.createProduct(req, res);
    }

    async getProduct(req, res) {
        return SanPhamController.getProduct(req, res);
    }

    async getAllProducts(req, res) {
        return SanPhamController.getAllProducts(req, res);
    }

    async updateProduct(req, res) {
        return SanPhamController.updateProduct(req, res);
    }

    async deleteProduct(req, res) {
        return SanPhamController.deleteProduct(req, res);
    }

    // ==========================
    // CATEGORY MANAGEMENT
    // ==========================
    async createCategory(req, res) {
        return LoaiSanPhamController.createCategory(req, res);
    }

    async getCategory(req, res) {
        return LoaiSanPhamController.getCategoryById(req, res);
    }

    async getAllCategories(req, res) {
        return LoaiSanPhamController.getAllCategories(req, res);
    }

    async updateCategory(req, res) {
        return LoaiSanPhamController.updateCategory(req, res);
    }

    async deleteCategory(req, res) {
        return LoaiSanPhamController.deleteCategory(req, res);
    }

    // ==========================
    // ROLE MANAGEMENT
    // ==========================
    async createRole(req, res) {
        return RoleController.createRole(req, res);
    }

    async getRole(req, res) {
        return RoleController.getRoleById(req, res);
    }

    async getAllRoles(req, res) {
        return RoleController.getAllRoles(req, res);
    }

    async updateRole(req, res) {
        return RoleController.updateRole(req, res);
    }

    async deleteRole(req, res) {
        return RoleController.deleteRole(req, res);
    }

    // ==========================
    // ACCOUNT MANAGEMENT
    // ==========================
    async createUser(req, res) {
        return TaiKhoanController.createUser(req, res);
    }

    async getAllUsers(req, res) {
        return TaiKhoanController.getAllUsers(req, res);
    }

    async getCustomers(req, res) {
        try {
            const { page = 1, limit = 100, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            
            // Lấy Customer role
            const customerRole = await Role.findOne({ TenVaiTro: 'Customer' });
            if (!customerRole) {
                return res.status(404).json({
                    message: 'Không tìm thấy role Customer',
                    data: []
                });
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Lấy tất cả tài khoản có role Customer
            const [customers, total] = await Promise.all([
                TaiKhoan.find({ MaVaiTro: customerRole._id })
                    .populate('MaVaiTro', 'TenVaiTro')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                TaiKhoan.countDocuments({ MaVaiTro: customerRole._id })
            ]);

            // Lấy thông tin đơn hàng cho mỗi customer
            const customersWithOrders = await Promise.all(
                customers.map(async (customer) => {
                    // MaKhachHang có thể là string hoặc ObjectId, cần match cả 2
                    const customerIdStr = customer._id.toString();
                    const orderStats = await DonHang.aggregate([
                        {
                            $match: {
                                $or: [
                                    { MaKhachHang: customerIdStr },
                                    { MaKhachHang: customer._id }
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                orderCount: { $sum: 1 },
                                totalRevenue: { $sum: '$TongTien' }
                            }
                        }
                    ]);

                    const stats = orderStats[0] || { orderCount: 0, totalRevenue: 0 };

                    return {
                        _id: customer._id,
                        HoTen: customer.HoTen,
                        Email: customer.Email,
                        SoDienThoai: customer.SoDienThoai,
                        GioiTinh: customer.GioiTinh,
                        NgaySinh: customer.NgaySinh,
                        TrangThai: customer.TrangThai,
                        orderCount: stats.orderCount,
                        totalRevenue: stats.totalRevenue || 0,
                        MaVaiTro: customer.MaVaiTro,
                        createdAt: customer.createdAt,
                        updatedAt: customer.updatedAt
                    };
                })
            );

            return res.status(200).json({
                message: 'Lấy danh sách khách hàng thành công',
                data: customersWithOrders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách khách hàng:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy danh sách khách hàng',
                error: error.message
            });
        }
    }

    async updateCustomer(req, res) {
        return TaiKhoanController.updateCustomer(req, res);
    }

    async deleteCustomer(req, res) {
        return TaiKhoanController.deleteCustomer(req, res);
    }

    async lockCustomer(req, res) {
        return TaiKhoanController.lockCustomer(req, res);
    }

    async changeCustomerRole(req, res) {
        return TaiKhoanController.changeCustomerRole(req, res);
    }

    async getUser(req, res) {
        return TaiKhoanController.getMe(req, res);
    }

    async updateUser(req, res) {
        return TaiKhoanController.updateUser(req, res);
    }

    async deleteUser(req, res) {
        return TaiKhoanController.deleteUser(req, res);
    }

    // ==========================
    // ORDER MANAGEMENT
    // ==========================
    async createOrder(req, res) {
        return DonHangController.createDonHang(req, res);
    }

    async getAllOrders(req, res) {
        return DonHangController.getAllOrders(req, res);
    }

    async getOrder(req, res) {
        return DonHangController.getOrderDetail(req, res);
    }

    async getUserOrders(req, res) {
        return DonHangController.getDonHang(req, res);
    }

    async updateOrder(req, res) {
        return DonHangController.updateDonHang(req, res);
    }

    async deleteOrder(req, res) {
        return DonHangController.deleteDonHang(req, res);
    }

    async cancelOrder(req, res) {
        return DonHangController.cancelDonHang(req, res);
    }

    async checkout(req, res) {
        return DonHangController.checkout(req, res);
    }

    // ==========================
    // CART MANAGEMENT
    // ==========================
    async addToCart(req, res) {
        return GioHangController.addToCart(req, res);
    }

    async getCart(req, res) {
        return GioHangController.getCart(req, res);
    }

    async updateCart(req, res) {
        return GioHangController.updateCart(req, res);
    }

    async deleteCartItem(req, res) {
        return GioHangController.deleteCart(req, res);
    }

    async clearCart(req, res) {
        return GioHangController.deleteAllCart(req, res);
    }

    // ==========================
    // INVENTORY MANAGEMENT
    // ==========================
    async getInventory(req, res) {
        return KhoController.getInventory(req, res);
    }

    async getInventoryItem(req, res) {
        return KhoController.getInventoryItem(req, res);
    }

    async increaseStock(req, res) {
        return KhoController.increaseStock(req, res);
    }

    async decreaseStock(req, res) {
        return KhoController.decreaseStock(req, res);
    }

    async setStock(req, res) {
        return KhoController.setStock(req, res);
    }

    async clearStock(req, res) {
        return KhoController.clearStock(req, res);
    }

    // ==========================
    // STATISTICS / DASHBOARD
    // ==========================
    async getSummaryStats(req, res) {
        try {
            const [totalProducts, totalCategories, totalRoles, totalUsers, ordersStats] = await Promise.all([
                SanPham.countDocuments(),
                LoaiSanPham.countDocuments(),
                Role.countDocuments(),
                TaiKhoan.countDocuments(),
                DonHang.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            totalRevenue: { $sum: '$TongTien' }
                        }
                    }
                ])
            ]);

            const stats = ordersStats[0] || { totalOrders: 0, totalRevenue: 0 };

            return res.status(200).json({
                message: 'Thống kê tổng quan',
                data: {
                    totalProducts,
                    totalCategories,
                    totalRoles,
                    totalUsers,
                    totalOrders: stats.totalOrders,
                    totalRevenue: stats.totalRevenue
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy thống kê tổng quan:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy thống kê tổng quan',
                error: error.message
            });
        }
    }

    async getRevenueStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const match = {};

            if (startDate || endDate) {
                match.createdAt = {};
                if (startDate) {
                    match.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    match.createdAt.$lte = new Date(endDate);
                }
            }

            const stats = await DonHang.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$TongTien' },
                        totalOrders: { $sum: 1 }
                    }
                }
            ]);

            const { totalRevenue = 0, totalOrders = 0 } = stats[0] || {};

            return res.status(200).json({
                message: 'Thống kê doanh thu',
                data: {
                    totalRevenue,
                    totalOrders
                }
            });
        } catch (error) {
            console.error('Lỗi khi thống kê doanh thu:', error);
            return res.status(500).json({
                message: 'Lỗi khi thống kê doanh thu',
                error: error.message
            });
        }
    }

    async getTopSellingProducts(req, res) {
        try {
            const { limit = 5 } = req.query;
            const topProducts = await SanPham.find({})
                .sort({ DaBan: -1 })
                .limit(Number(limit) || 5)
                .select('TenSanPham DaBan Gia')
                .populate('MaLoaiSanPham', 'TenLoaiSanPham');

            return res.status(200).json({
                message: 'Top sản phẩm bán chạy',
                data: topProducts
            });
        } catch (error) {
            console.error('Lỗi khi lấy top sản phẩm:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy top sản phẩm',
                error: error.message
            });
        }
    }

    async getLowStockProducts(req, res) {
        try {
            const { threshold = 5 } = req.query;
            const lowStockProducts = await SanPham.find({
                SoLuong: { $lte: Number(threshold) || 5 }
            })
            .sort({ SoLuong: 1 })
            .select('TenSanPham SoLuong Gia')
            .populate('MaLoaiSanPham', 'TenLoaiSanPham');

            return res.status(200).json({
                message: 'Sản phẩm sắp hết hàng',
                data: lowStockProducts
            });
        } catch (error) {
            console.error('Lỗi khi lấy sản phẩm sắp hết hàng:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy sản phẩm sắp hết hàng',
                error: error.message
            });
        }
    }

    async getMonthlyOrdersStats(req, res) {
        try {
            const months = Math.max(1, Math.min(parseInt(req.query.months, 10) || 6, 24));
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

            const stats = await DonHang.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startDate
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$TongTien' }
                    }
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1 }
                }
            ]);

            const formatted = stats.map((item) => ({
                year: item._id.year,
                month: item._id.month,
                totalOrders: item.totalOrders,
                totalRevenue: item.totalRevenue
            }));

            return res.status(200).json({
                message: 'Thống kê đơn hàng theo tháng',
                data: formatted
            });
        } catch (error) {
            console.error('Lỗi khi thống kê đơn hàng theo tháng:', error);
            return res.status(500).json({
                message: 'Lỗi khi thống kê đơn hàng theo tháng',
                error: error.message
            });
        }
    }

    async getTopCustomersByOrders(req, res) {
        try {
            const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 5, 20));

            const topCustomers = await DonHang.aggregate([
                {
                    $match: {
                        MaKhachHang: { $ne: null }
                    }
                },
                {
                    $addFields: {
                        customerObjectId: {
                            $switch: {
                                branches: [
                                    {
                                        case: { $eq: [{ $type: '$MaKhachHang' }, 'objectId'] },
                                        then: '$MaKhachHang'
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: [{ $type: '$MaKhachHang' }, 'string'] },
                                                {
                                                    $regexMatch: {
                                                        input: '$MaKhachHang',
                                                        regex: /^[a-fA-F0-9]{24}$/
                                                    }
                                                }
                                            ]
                                        },
                                        then: { $toObjectId: '$MaKhachHang' }
                                    }
                                ],
                                default: null
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$MaKhachHang',
                        customerObjectId: { $first: '$customerObjectId' },
                        orderCount: { $sum: 1 },
                        totalRevenue: { $sum: '$TongTien' }
                    }
                },
                {
                    $lookup: {
                        from: 'Taikhoan',
                        localField: 'customerObjectId',
                        foreignField: '_id',
                        as: 'customer'
                    }
                },
                {
                    $addFields: {
                        customer: { $first: '$customer' }
                    }
                },
                {
                    $project: {
                        customerId: '$_id',
                        orderCount: 1,
                        totalRevenue: 1,
                        name: {
                            $ifNull: [
                                '$customer.HoTen',
                                {
                                    $ifNull: [
                                        '$customer.TenDangNhap',
                                        '$customer.username'
                                    ]
                                }
                            ]
                        },
                        email: '$customer.Email'
                    }
                },
                {
                    $sort: { orderCount: -1, totalRevenue: -1 }
                },
                {
                    $limit: limit
                }
            ]);

            return res.status(200).json({
                message: 'Top khách hàng theo số lượng đơn hàng',
                data: topCustomers
            });
        } catch (error) {
            console.error('Lỗi khi lấy top khách hàng:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy top khách hàng',
                error: error.message
            });
        }
    }
}

module.exports = new AdminController();
