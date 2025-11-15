const SanPham = require('../models/SanPham');
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const { HTTP_STATUS, MESSAGES, PAGINATION } = require('../../constants');

class SanPhamController {
    async createProduct(req, res) {
        try{
            const product = await SanPham.create(req.body);
            return successResponse(res, product, 'Sản phẩm đã được tạo', HTTP_STATUS.CREATED);
        } catch (error) {
            console.error('Lỗi khi tạo sản phẩm: ', error);
            return errorResponse(res, 'Lỗi khi tạo sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async getProduct(req, res) {
        try{
            const product = await SanPham.findById(req.params.id);
            if (!product) {
                return errorResponse(res, MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }
            return successResponse(res, { product }, 'Lấy sản phẩm thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi lấy sản phẩm: ', error);
            return errorResponse(res, 'Lỗi khi lấy sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async getAllProducts(req, res) {
        try {
            const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const [products, total] = await Promise.all([
                SanPham.find()
                    .populate('MaLoaiSanPham', 'TenLoaiSanPham')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                SanPham.countDocuments()
            ]);

            return paginatedResponse(res, products, page, limit, total);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách sản phẩm: ', error);
            return errorResponse(res, 'Lỗi khi lấy danh sách sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async updateProduct(req, res) {
        try {
            const product = await SanPham.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!product) {
                return errorResponse(res, MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }
            return successResponse(res, product, 'Sản phẩm đã được cập nhật', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi cập nhật sản phẩm: ', error);
            return errorResponse(res, 'Lỗi khi cập nhật sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteProduct(req, res) {
        try {
            const product = await SanPham.findByIdAndDelete(req.params.id);
            if (!product) {
                return errorResponse(res, MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }
            return successResponse(res, product, 'Sản phẩm đã được xóa', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm: ', error);
            return errorResponse(res, 'Lỗi khi xóa sản phẩm', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    
}
module.exports = new SanPhamController();