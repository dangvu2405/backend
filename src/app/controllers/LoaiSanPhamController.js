const LoaiSanPham = require('../models/LoaiSanPham');
const { successResponse, errorResponse } = require('../../utils/response');
const { HTTP_STATUS, MESSAGES } = require('../../constants');

class LoaiSanPhamController {
    async createCategory(req, res) {
        try {
            const { TenLoaiSanPham } = req.body;

            if (!TenLoaiSanPham || !TenLoaiSanPham.trim()) {
                return errorResponse(res, 'Tên loại sản phẩm là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const existingCategory = await LoaiSanPham.findByName(TenLoaiSanPham.trim());
            if (existingCategory) {
                return errorResponse(res, 'Loại sản phẩm đã tồn tại', HTTP_STATUS.BAD_REQUEST);
            }

            const category = await LoaiSanPham.create({
                TenLoaiSanPham: TenLoaiSanPham.trim()
            });

            return successResponse(res, { category }, 'Tạo loại sản phẩm thành công', HTTP_STATUS.CREATED);
        } catch (error) {
            console.error('Lỗi khi tạo loại sản phẩm:', error);
            return errorResponse(res, 'Lỗi khi tạo loại sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getAllCategories(req, res) {
        try {
            const { keyword = '' } = req.query;

            const query = keyword
                ? { TenLoaiSanPham: { $regex: keyword, $options: 'i' } }
                : {};

            const categories = await LoaiSanPham.find(query).sort({ TenLoaiSanPham: 1 });

            return successResponse(res, categories, 'Lấy danh sách loại sản phẩm thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách loại sản phẩm:', error);
            return errorResponse(res, 'Lỗi khi lấy danh sách loại sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getCategoryById(req, res) {
        try {
            const { id } = req.params;

            const category = await LoaiSanPham.findById(id);
            if (!category) {
                return errorResponse(res, 'Không tìm thấy loại sản phẩm', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, { category }, 'Lấy loại sản phẩm thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi lấy loại sản phẩm:', error);
            return errorResponse(res, 'Lỗi khi lấy loại sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const { TenLoaiSanPham } = req.body;

            if (!TenLoaiSanPham || !TenLoaiSanPham.trim()) {
                return errorResponse(res, 'Tên loại sản phẩm là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            // Kiểm tra trùng tên với category khác
            const existingCategory = await LoaiSanPham.findOne({
                TenLoaiSanPham: TenLoaiSanPham.trim(),
                _id: { $ne: id }
            });
            if (existingCategory) {
                return errorResponse(res, 'Loại sản phẩm đã tồn tại', HTTP_STATUS.BAD_REQUEST);
            }

            const category = await LoaiSanPham.findByIdAndUpdate(
                id,
                { TenLoaiSanPham: TenLoaiSanPham.trim() },
                { new: true, runValidators: true }
            );

            if (!category) {
                return errorResponse(res, 'Không tìm thấy loại sản phẩm', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, { category }, 'Cập nhật loại sản phẩm thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi cập nhật loại sản phẩm:', error);
            return errorResponse(res, 'Lỗi khi cập nhật loại sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteCategory(req, res) {
        try {
            const { id } = req.params;

            const category = await LoaiSanPham.findById(id);
            if (!category) {
                return errorResponse(res, 'Không tìm thấy loại sản phẩm', HTTP_STATUS.NOT_FOUND);
            }

            // Kiểm tra xem có sản phẩm nào đang sử dụng category này không
            const SanPham = require('../models/SanPham');
            const productsUsingCategory = await SanPham.countDocuments({ MaLoaiSanPham: id });
            if (productsUsingCategory > 0) {
                return errorResponse(res, `Không thể xóa loại sản phẩm. Có ${productsUsingCategory} sản phẩm đang sử dụng loại này.`, HTTP_STATUS.BAD_REQUEST);
            }

            await category.deleteOne();

            return successResponse(res, { category }, 'Xóa loại sản phẩm thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi xóa loại sản phẩm:', error);
            return errorResponse(res, 'Lỗi khi xóa loại sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = new LoaiSanPhamController();