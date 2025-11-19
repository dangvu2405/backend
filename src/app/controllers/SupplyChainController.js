const SanPham = require('../models/SanPham');
const blockchainTraceService = require('../services/blockchainTrace.service');
const { getTraceContract, isBlockchainEnabled } = require('../../config/blockchain');

class SupplyChainController {
    async getProductTrace(req, res, next) {
        try {
            const { productId } = req.params;

            if (!productId) {
                return res.status(400).json({
                    message: 'Thiếu mã sản phẩm để truy vết chuỗi cung ứng',
                });
            }

            const productDoc = await SanPham.findById(productId)
                .populate('MaLoaiSanPham')
                .lean();

            if (!productDoc) {
                return res.status(404).json({
                    message: 'Không tìm thấy sản phẩm để truy vết',
                });
            }

            const traceData = await blockchainTraceService.buildProductTrace(productDoc);

            if (!traceData) {
                return res.status(404).json({
                    message: 'Sản phẩm chưa có dữ liệu truy vết trên blockchain. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
                    productId,
                    productName: productDoc.TenSanPham,
                });
            }

            return res.status(200).json({
                message: 'Lấy truy vết chuỗi cung ứng thành công',
                data: traceData,
            });
        } catch (error) {
            next(error);
        }
    }

    async lookupTrace(req, res, next) {
        try {
            const { productCode, batchCode } = req.query;

            if (!productCode && !batchCode) {
                return res.status(400).json({
                    message: 'Vui lòng cung cấp mã sản phẩm hoặc mã lô để tra cứu',
                });
            }

            const traceData = await blockchainTraceService.lookupTrace({
                productCode,
                batchCode,
            });

            if (!traceData) {
                return res.status(404).json({
                    message: 'Không tìm thấy sản phẩm hoặc sản phẩm chưa có dữ liệu truy vết trên blockchain',
                    searchParams: { productCode, batchCode },
                });
            }

            return res.status(200).json({
                message: 'Tra cứu chuỗi cung ứng thành công',
                data: traceData,
            });
        } catch (error) {
            next(error);
        }
    }

    async initProduct(req, res, next) {
        try {
            const { productId } = req.params;
            const { batchId, sku } = req.body;

            if (!isBlockchainEnabled()) {
                return res.status(503).json({
                    message: 'Blockchain chưa được kích hoạt. Vui lòng kiểm tra cấu hình.',
                });
            }

            if (!productId) {
                return res.status(400).json({
                    message: 'Thiếu mã sản phẩm',
                });
            }

            const productDoc = await SanPham.findById(productId).lean();

            if (!productDoc) {
                return res.status(404).json({
                    message: 'Không tìm thấy sản phẩm',
                });
            }

            const contract = getTraceContract();

            if (!contract) {
                return res.status(503).json({
                    message: 'Không thể kết nối với hợp đồng thông minh. Vui lòng kiểm tra cấu hình.',
                });
            }

            // Kiểm tra xem đã init chưa
            let isInitialized = false;
            try {
                const trace = await contract.getTrace(productId);
                isInitialized = trace && trace[0]; // batchId
            } catch (err) {
                isInitialized = false;
            }

            if (isInitialized) {
                return res.status(400).json({
                    message: 'Sản phẩm đã được khởi tạo trên blockchain',
                });
            }

            const finalBatchId = batchId || productDoc.LoSanXuat || `BATCH-${productId.slice(-6)}`;
            const finalSku = sku || productDoc.MaSanPham || productDoc.MaSKU || `SKU-${productId.slice(-6)}`;

            const tx = await contract.initProduct(productId, finalBatchId, finalSku);
            await tx.wait();

            return res.status(200).json({
                message: 'Khởi tạo sản phẩm trên blockchain thành công',
                data: {
                    productId,
                    batchId: finalBatchId,
                    sku: finalSku,
                    transactionHash: tx.hash,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async recordEvent(req, res, next) {
        try {
            const { productId } = req.params;
            const { eventType, description, location, ipfsHash } = req.body;

            if (!isBlockchainEnabled()) {
                return res.status(503).json({
                    message: 'Blockchain chưa được kích hoạt. Vui lòng kiểm tra cấu hình.',
                });
            }

            if (!productId || !eventType || !description) {
                return res.status(400).json({
                    message: 'Thiếu thông tin bắt buộc: productId, eventType, description',
                });
            }

            const productDoc = await SanPham.findById(productId).lean();

            if (!productDoc) {
                return res.status(404).json({
                    message: 'Không tìm thấy sản phẩm',
                });
            }

            const contract = getTraceContract();

            if (!contract) {
                return res.status(503).json({
                    message: 'Không thể kết nối với hợp đồng thông minh. Vui lòng kiểm tra cấu hình.',
                });
            }

            const tx = await contract.recordEvent(
                productId,
                eventType,
                description,
                location || '',
                ipfsHash || ''
            );
            await tx.wait();

            return res.status(200).json({
                message: 'Ghi sự kiện thành công',
                data: {
                    productId,
                    eventType,
                    transactionHash: tx.hash,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async issueCertificate(req, res, next) {
        try {
            const { productId } = req.params;
            const { name, issuer, ipfsHash, expiresAt } = req.body;

            if (!isBlockchainEnabled()) {
                return res.status(503).json({
                    message: 'Blockchain chưa được kích hoạt. Vui lòng kiểm tra cấu hình.',
                });
            }

            if (!productId || !name || !issuer) {
                return res.status(400).json({
                    message: 'Thiếu thông tin bắt buộc: productId, name, issuer',
                });
            }

            const productDoc = await SanPham.findById(productId).lean();

            if (!productDoc) {
                return res.status(404).json({
                    message: 'Không tìm thấy sản phẩm',
                });
            }

            const contract = getTraceContract();

            if (!contract) {
                return res.status(503).json({
                    message: 'Không thể kết nối với hợp đồng thông minh. Vui lòng kiểm tra cấu hình.',
                });
            }

            // Nếu không có expiresAt, mặc định là 1 năm từ bây giờ
            const finalExpiresAt = expiresAt || Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

            const tx = await contract.issueCertificate(
                productId,
                name,
                issuer,
                ipfsHash || '',
                finalExpiresAt
            );
            await tx.wait();

            return res.status(200).json({
                message: 'Cấp chứng nhận thành công',
                data: {
                    productId,
                    name,
                    issuer,
                    expiresAt: new Date(finalExpiresAt * 1000).toISOString(),
                    transactionHash: tx.hash,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SupplyChainController();

