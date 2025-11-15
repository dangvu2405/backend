const GioHang = require('../models/GioHang');
const { successResponse, errorResponse } = require('../../utils/response');
const { HTTP_STATUS, MESSAGES } = require('../../constants');

const resolveCartOwnerId = (req) => {
    return req.user?.id
        || req.headers['x-cart-owner']
        || req.headers['x-guest-id']
        || req.query?.userId
        || req.query?.guestId
        || req.cookies?.guestId
        || req.body?.userId
        || req.body?.guestId
        || null;
};

class GioHangController {
    async addToCart(req, res) {
        try{        
            const ownerId = resolveCartOwnerId(req) || req.body?.userId;
            const { productId, quantity } = req.body;

            if (!ownerId || !productId) {
                return errorResponse(res, 'Thiếu thông tin người dùng hoặc sản phẩm', HTTP_STATUS.BAD_REQUEST);
            }

            const cart = await GioHang.create({
                IdKhachHang: ownerId,
                MaSanPham: productId,
                quantity: quantity
            });
            if (!cart) {
                return errorResponse(res, 'Không thể thêm vào giỏ hàng', HTTP_STATUS.NOT_FOUND);
            }
            return successResponse(res, { cart }, 'Đã thêm vào giỏ hàng', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi thêm vào giỏ hàng: ', error);
            return errorResponse(res, 'Lỗi khi thêm vào giỏ hàng', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    // lấy giỏ hàng api
    async getCart(req, res) {
        try{
            const userId = resolveCartOwnerId(req);
            if (!userId) {
                return successResponse(res, { cart: { Items: [] } }, 'Đã lấy giỏ hàng (guest)', HTTP_STATUS.OK);
            }

            // Sử dụng model GioHang với IdKhachHang
            const cart = await GioHang.findOne({ IdKhachHang: userId })
                .populate('Items.IdSanPham', 'TenSanPham Gia KhuyenMai HinhAnhChinh MaLoaiSanPham')
                .lean();
            
            if (!cart) {
                // Trả về cart rỗng nếu chưa có
                return successResponse(res, { cart: { Items: [] } }, 'Đã lấy giỏ hàng', HTTP_STATUS.OK);
            }
            
            return successResponse(res, { cart }, 'Đã lấy giỏ hàng', HTTP_STATUS.OK);
        }
        catch(error){
            console.error('Lỗi khi lấy giỏ hàng: ', error);
            return errorResponse(res, 'Lỗi khi lấy giỏ hàng', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async updateCart(req, res) {
        try {
            const userId = resolveCartOwnerId(req);
            if (!userId) {
                return errorResponse(res, 'Không xác định được người dùng/khách', HTTP_STATUS.BAD_REQUEST);
            }

            // items là array các sản phẩm từ localStorage
            const { items } = req.body;
            
            if (!Array.isArray(items)) {
                return errorResponse(res, 'Dữ liệu giỏ hàng không hợp lệ', HTTP_STATUS.BAD_REQUEST);
            }

            // Sử dụng model GioHang với IdKhachHang và Items
            // Tìm hoặc tạo giỏ hàng
            let cart = await GioHang.findOne({ IdKhachHang: userId });
            
            if (!cart) {
                // Tạo giỏ hàng mới nếu chưa có
                cart = await GioHang.create({
                    IdKhachHang: userId,
                    Items: []
                });
            }

            // Map items từ localStorage format sang database format
            // Cần lấy thông tin sản phẩm từ database để có TenSanPham, Gia
            const SanPham = require('../models/SanPham');
            const mappedItems = [];
            
            for (const item of items) {
                try {
                    const product = await SanPham.findById(item.id).select('TenSanPham Gia KhuyenMai');
                    if (product) {
                        const gia = product.Gia || 0;
                        const giamGia = product.KhuyenMai || 0;
                        const finalGia = giamGia > 0 ? Math.round(gia * (1 - giamGia / 100)) : gia;
                        
                        mappedItems.push({
                            IdSanPham: item.id,
                            TenSanPham: product.TenSanPham || item.tenSP || 'Sản phẩm',
                            Gia: finalGia,
                            SoLuong: item.quantity || 1,
                            ThanhTien: finalGia * (item.quantity || 1)
                        });
                    }
                } catch (err) {
                    console.error(`Error processing product ${item.id}:`, err.message);
                    // Skip invalid products
                }
            }

            // Cập nhật toàn bộ giỏ hàng
            cart.Items = mappedItems;
            await cart.save();

            // Populate để trả về đầy đủ thông tin
            const updatedCart = await GioHang.findById(cart._id)
                .populate('Items.IdSanPham', 'TenSanPham Gia KhuyenMai HinhAnhChinh MaLoaiSanPham')
                .lean();

            return successResponse(res, { cart: updatedCart }, 'Đã cập nhật giỏ hàng thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi cập nhật giỏ hàng: ', error);
            return errorResponse(res, 'Lỗi khi cập nhật giỏ hàng', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteCart(req, res) {
        try{
            const userId = resolveCartOwnerId(req);
            if (!userId) {
                return errorResponse(res, 'Không xác định được người dùng/khách', HTTP_STATUS.BAD_REQUEST);
            }
            const cart = await GioHang.findByIdAndDelete({ MaKhachHang: userId, MaSanPham: req.params.id });
            if (!cart) {
                return errorResponse(res, 'Không tìm thấy giỏ hàng', HTTP_STATUS.NOT_FOUND);
            }
            return successResponse(res, { cart }, 'Đã xóa giỏ hàng', HTTP_STATUS.OK);
        }
        catch(error){
            console.error('Lỗi khi xóa giỏ hàng: ', error);
            return errorResponse(res, 'Lỗi khi xóa giỏ hàng', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteAllCart(req, res) {
        try{
            const userId = resolveCartOwnerId(req);
            if (!userId) {
                return errorResponse(res, 'Không xác định được người dùng/khách', HTTP_STATUS.BAD_REQUEST);
            }
            const cart = await GioHang.findByIdAndDelete({ MaKhachHang: userId });
            if (!cart) {
                return errorResponse(res, 'Không tìm thấy giỏ hàng', HTTP_STATUS.NOT_FOUND);
            }
            return successResponse(res, { cart }, 'Đã xóa tất cả sản phẩm trong giỏ hàng', HTTP_STATUS.OK);
        }
        catch(error){
            console.error('Lỗi khi xóa tất cả sản phẩm trong giỏ hàng: ', error);
            return errorResponse(res, 'Lỗi khi xóa giỏ hàng', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}
module.exports = new GioHangController();