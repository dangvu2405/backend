const Role = require('../models/Role');
const TaiKhoan = require('../models/Taikhoan');
const { successResponse, errorResponse } = require('../../utils/response');
const { HTTP_STATUS, MESSAGES } = require('../../constants');

class RoleController {
    async createRole(req, res) {
        try {
            const { TenVaiTro } = req.body;

            if (!TenVaiTro || !TenVaiTro.trim()) {
                return errorResponse(res, 'Tên vai trò là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const roleName = TenVaiTro.trim();
            const existingRole = await Role.findByName(roleName);
            if (existingRole) {
                return errorResponse(res, 'Vai trò đã tồn tại', HTTP_STATUS.BAD_REQUEST);
            }

            const role = await Role.create({ TenVaiTro: roleName });
            return successResponse(res, { role }, 'Tạo vai trò thành công', HTTP_STATUS.CREATED);
        } catch (error) {
            console.error('Lỗi khi tạo vai trò:', error);
            return errorResponse(res, 'Lỗi khi tạo vai trò', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getAllRoles(req, res) {
        try {
            const { keyword = '' } = req.query;
            const filter = keyword
                ? { TenVaiTro: { $regex: keyword, $options: 'i' } }
                : {};

            const roles = await Role.find(filter).sort({ TenVaiTro: 1 });
            return successResponse(res, { roles }, 'Lấy danh sách vai trò thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách vai trò:', error);
            return errorResponse(res, 'Lỗi khi lấy danh sách vai trò', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async getRoleById(req, res) {
        try {
            const { id } = req.params;
            const role = await Role.findById(id);

            if (!role) {
                return errorResponse(res, 'Không tìm thấy vai trò', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, { role }, 'Lấy vai trò thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi lấy vai trò:', error);
            return errorResponse(res, 'Lỗi khi lấy vai trò', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async updateRole(req, res) {
        try {
            const { id } = req.params;
            const { TenVaiTro } = req.body;

            if (!TenVaiTro || !TenVaiTro.trim()) {
                return errorResponse(res, 'Tên vai trò là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const roleName = TenVaiTro.trim();
            const existingRole = await Role.findOne({
                TenVaiTro: roleName,
                _id: { $ne: id }
            });

            if (existingRole) {
                return errorResponse(res, 'Vai trò đã tồn tại', HTTP_STATUS.BAD_REQUEST);
            }

            const role = await Role.findByIdAndUpdate(
                id,
                { TenVaiTro: roleName },
                { new: true, runValidators: true }
            );

            if (!role) {
                return errorResponse(res, 'Không tìm thấy vai trò', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, { role }, 'Cập nhật vai trò thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi cập nhật vai trò:', error);
            return errorResponse(res, 'Lỗi khi cập nhật vai trò', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteRole(req, res) {
        try {
            const { id } = req.params;
            const role = await Role.findById(id);

            if (!role) {
                return errorResponse(res, 'Không tìm thấy vai trò', HTTP_STATUS.NOT_FOUND);
            }

            const isRoleInUse = await TaiKhoan.exists({ MaVaiTro: role._id });
            if (isRoleInUse) {
                return errorResponse(res, 'Không thể xóa vai trò đang được sử dụng', HTTP_STATUS.BAD_REQUEST);
            }

            await role.deleteOne();

            return successResponse(res, { role }, 'Xóa vai trò thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi xóa vai trò:', error);
            return errorResponse(res, 'Lỗi khi xóa vai trò', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = new RoleController();