const crypto = require('crypto');
const Ship = require('../models/Ship');
const DonHang = require('../models/DonHang');
const SanPham = require('../models/SanPham');
const {
    getTraceContract,
    getBlockchainProvider,
    isBlockchainEnabled,
} = require('../../config/blockchain');

const TRACE_QR_BASE_URL = process.env.TRACE_QR_BASE_URL || 'http://localhost:5174';
const DEFAULT_EXPLORER_URL =
    process.env.BLOCKCHAIN_EXPLORER_URL ||
    (process.env.TRACE_CONTRACT_ADDRESS
        ? `https://sepolia.etherscan.io/address/${process.env.TRACE_CONTRACT_ADDRESS}`
        : null);

const generateHash = (input) =>
    crypto.createHash('sha256').update(input).digest('hex');

const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toISOString();
};

const normalizeProduct = (product) => {
    if (!product) return null;

    return {
        id: product._id?.toString(),
        name: product.TenSanPham,
        sku: product.MaSanPham || product.MaSKU || null,
        category: product.MaLoaiSanPham?.TenLoaiSanPham ?? null,
        createdAt: formatDate(product.createdAt),
        updatedAt: formatDate(product.updatedAt),
        batchId: product.LoSanXuat || product.BatchId || `BATCH-${product._id?.toString().slice(-6)}`,
    };
};

const mapShipmentToTransport = (shipment) => {
    if (!shipment) return null;

    return {
        status: shipment.TrangThai,
        carrier: shipment.DonViVanChuyen,
        trackingCode: shipment.MaVanDon,
        lastUpdated: formatDate(shipment.updatedAt),
        pickupTime: formatDate(shipment.ThoiGianLayHang),
        eta: formatDate(shipment.ThoiGianGiaoDuKien),
        deliveredAt: formatDate(shipment.ThoiGianGiaoThucTe),
        history: Array.isArray(shipment.LichSuTrangThai)
            ? shipment.LichSuTrangThai.map((entry, index) => ({
                  id: `${shipment._id}-${index}`,
                  status: entry.TrangThai,
                  description: entry.MoTa,
                  location: entry.DiaDiem || null,
                  timestamp: formatDate(entry.ThoiGian),
              }))
            : [],
    };
};

// Đã bỏ fallback mock data - chỉ sử dụng dữ liệu on-chain thực

const findRelatedShipment = async (productId) => {
    const order = await DonHang.findOne({
        'SanPham.MaSanPham': productId,
    }).lean();

    if (!order) {
        return null;
    }

    return Ship.findOne({ MaDonHang: order._id }).lean();
};

const buildQrData = (product) => {
    const normalizedBaseUrl = TRACE_QR_BASE_URL.replace(/\/+$/, '');
    const traceUrl = `${normalizedBaseUrl}/products/${product.id}/trace`;
    return {
        url: traceUrl,
        payload: {
            productId: product.id ?? null,
            batchId: product.batchId,
            checksum: generateHash(`${product.id}-${traceUrl}`).slice(0, 32),
        },
    };
};

const normalizeBigNumber = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'object' && typeof value.toString === 'function') {
        return value.toString();
    }

    return value;
};

const formatOnChainTimestamp = (value) => {
    const normalized = normalizeBigNumber(value);
    if (!normalized) return null;

    const numeric = Number(normalized);
    if (Number.isNaN(numeric)) return null;

    return new Date(numeric * 1000).toISOString();
};

const fetchOnChainTrace = async (productDoc) => {
    if (!isBlockchainEnabled()) {
        return null;
    }

    const contract = getTraceContract();

    if (!contract || typeof contract.getTrace !== 'function') {
        return null;
    }

    try {
        const productId = productDoc._id.toString();
        const [batchId, sku, events = [], certificates = []] = await contract.getTrace(productId);

        const mappedEvents = events.map((event, index) => {
            const timestamp = formatOnChainTimestamp(event.timestamp);

            return {
                id: `${productId}-chain-${index}`,
                type: event.eventType || event.type || 'event',
                title: event.eventType || event.type || 'Sự kiện chuỗi cung ứng',
                description: event.description || '',
                location: event.location || null,
                actor: event.actor || null,
                timestamp,
                transactionHash: null,
                blockNumber: null,
            };
        });

        const mappedCertificates = certificates.map((certificate, index) => ({
            id: `${productId}-cert-${index}`,
            name: certificate.name || `Chứng nhận #${index + 1}`,
            issuer: certificate.issuer || 'Tổ chức cấp chứng nhận',
            issuedAt: formatOnChainTimestamp(certificate.issuedAt),
            expiresAt: formatOnChainTimestamp(certificate.expiresAt),
            ipfsHash: certificate.ipfsHash || null,
            verificationUrl:
                certificate.verificationUrl ||
                (certificate.ipfsHash ? `https://ipfs.io/ipfs/${certificate.ipfsHash}` : null) ||
                DEFAULT_EXPLORER_URL,
        }));

        let latestBlock = null;
        try {
            const provider = getBlockchainProvider();
            if (provider) {
                latestBlock = await provider.getBlockNumber();
            }
        } catch (blockError) {
            console.warn('[blockchainTrace] Unable to fetch latest block number:', blockError.message);
        }

        return {
            batchId,
            sku,
            events: mappedEvents,
            certificates: mappedCertificates,
            proof: {
                latestTransaction: null,
                latestBlock,
                merkleRoot: null,
                explorerUrl: DEFAULT_EXPLORER_URL,
            },
        };
    } catch (error) {
        console.warn('[blockchainTrace] Failed to fetch trace from blockchain:', error.message);
        return null;
    }
};

async function buildProductTrace(productDoc) {
    const product = normalizeProduct(productDoc);

    const onChainTrace = await fetchOnChainTrace(productDoc);

    // Không có dữ liệu on-chain → trả null (không fallback)
    if (!onChainTrace || !onChainTrace.batchId) {
        console.warn(`[blockchainTrace] Sản phẩm ${productDoc._id} chưa có trace on-chain`);
        return null;
    }

    // Cập nhật thông tin từ blockchain
    if (onChainTrace.batchId) {
        product.batchId = onChainTrace.batchId;
    }

    if (onChainTrace.sku) {
        product.sku = onChainTrace.sku;
    }

    const shipment = await findRelatedShipment(productDoc._id.toString());
    const transport = mapShipmentToTransport(shipment);

    // Chỉ dùng dữ liệu on-chain, không fallback
    const certificates = onChainTrace.certificates || [];
    const events = onChainTrace.events || [];

    const onChainProof = {
        latestTransaction: onChainTrace.proof?.latestTransaction ?? null,
        latestBlock: onChainTrace.proof?.latestBlock ?? null,
        merkleRoot: onChainTrace.proof?.merkleRoot ?? null,
        explorerUrl: onChainTrace.proof?.explorerUrl ?? DEFAULT_EXPLORER_URL,
    };

    return {
        product,
        transport,
        certificates,
        events,
        onChainProof,
        qr: buildQrData(product),
    };
}

async function lookupTrace({ productCode, batchCode }) {
    const filter = {};

    if (productCode) {
        filter.MaSanPham = productCode;
    }

    if (batchCode) {
        filter.LoSanXuat = batchCode;
    }

    const productDoc = await SanPham.findOne(filter).lean();

    if (!productDoc) {
        return null;
    }

    return buildProductTrace(productDoc);
}

module.exports = {
    buildProductTrace,
    lookupTrace,
};

