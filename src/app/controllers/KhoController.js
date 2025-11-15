const SanPham = require('../models/SanPham');

class KhoController {
    async getInventory(req, res) {
        try {
            const { min, max, categoryId } = req.query;
            const filter = {};

            if (categoryId) {
                filter.MaLoaiSanPham = categoryId;
            }

            if (min !== undefined || max !== undefined) {
                filter.SoLuong = {};
                if (min !== undefined) {
                    const minValue = Number(min);
                    if (!Number.isFinite(minValue)) {
                        return res.status(400).json({ message: 'Giá trị min không hợp lệ' });
                    }
                    filter.SoLuong.$gte = minValue;
                }
                if (max !== undefined) {
                    const maxValue = Number(max);
                    if (!Number.isFinite(maxValue)) {
                        return res.status(400).json({ message: 'Giá trị max không hợp lệ' });
                    }
                    filter.SoLuong.$lte = maxValue;
                }
            }

            const inventory = await SanPham.find(filter)
                .populate('MaLoaiSanPham', 'TenLoaiSanPham')
                .sort({ SoLuong: 1 });

            return res.status(200).json({
                message: 'Lấy danh sách tồn kho thành công',
                inventory
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách tồn kho:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy danh sách tồn kho',
                error: error.message
            });
        }
    }

    async getInventoryItem(req, res) {
        try {
            const { id } = req.params;
            const product = await SanPham.findById(id)
                .populate('MaLoaiSanPham', 'TenLoaiSanPham');

            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }

            return res.status(200).json({
                message: 'Lấy thông tin tồn kho thành công',
                product
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông tin tồn kho:', error);
            return res.status(500).json({
                message: 'Lỗi khi lấy thông tin tồn kho',
                error: error.message
            });
        }
    }

    async increaseStock(req, res) {
        try {
            const { id } = req.params;
            const { amount } = req.body;

            const increaseBy = Number(amount);
            if (!Number.isFinite(increaseBy) || increaseBy <= 0) {
                return res.status(400).json({ message: 'Số lượng tăng phải lớn hơn 0' });
            }

            const product = await SanPham.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }

            await product.increaseStock(increaseBy);

            return res.status(200).json({
                message: 'Tăng tồn kho thành công',
                product
            });
        } catch (error) {
            console.error('Lỗi khi tăng tồn kho:', error);
            return res.status(500).json({
                message: 'Lỗi khi tăng tồn kho',
                error: error.message
            });
        }
    }

    async decreaseStock(req, res) {
        try {
            const { id } = req.params;
            const { amount } = req.body;

            const decreaseBy = Number(amount);
            if (!Number.isFinite(decreaseBy) || decreaseBy <= 0) {
                return res.status(400).json({ message: 'Số lượng giảm phải lớn hơn 0' });
            }

            const product = await SanPham.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }

            await product.decreaseStock(decreaseBy);

            return res.status(200).json({
                message: 'Giảm tồn kho thành công',
                product
            });
        } catch (error) {
            console.error('Lỗi khi giảm tồn kho:', error);
            if (error.message === 'Không đủ hàng trong kho') {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({
                message: 'Lỗi khi giảm tồn kho',
                error: error.message
            });
        }
    }

    async setStock(req, res) {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            const newQuantity = Number(quantity);
            if (!Number.isFinite(newQuantity) || newQuantity < 0) {
                return res.status(400).json({ message: 'Số lượng phải là số không âm' });
            }

            const product = await SanPham.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }

            product.SoLuong = newQuantity;
            await product.save();

            return res.status(200).json({
                message: 'Cập nhật tồn kho thành công',
                product
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật tồn kho:', error);
            return res.status(500).json({
                message: 'Lỗi khi cập nhật tồn kho',
                error: error.message
            });
        }
    }

    async clearStock(req, res) {
        try {
            const { id } = req.params;
            const product = await SanPham.findById(id);

            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }

            product.SoLuong = 0;
            await product.save();

            return res.status(200).json({
                message: 'Đã xóa tồn kho sản phẩm',
                product
            });
        } catch (error) {
            console.error('Lỗi khi xóa tồn kho:', error);
            return res.status(500).json({
                message: 'Lỗi khi xóa tồn kho',
                error: error.message
            });
        }
    }
}

module.exports = new KhoController();
