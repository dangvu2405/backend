const crypto = require('crypto');
const mongoose = require('mongoose');
const DonHang = require('../models/DonHang');

/**
 * ============================================
 * 💳 VNPAY PAYMENT CONTROLLER
 * ============================================
 */
class VNPayController {
    /**
     * Tạo URL thanh toán VNPay
     */
    async createPaymentUrl(req, res) {
        try {
            const { orderId, amount, orderDescription, orderType = 'other', bankCode, language = 'vn' } = req.body;
            // Không yêu cầu userId vì có thể là guest checkout

            if (!orderId || !amount) {
                return res.status(400).json({ 
                    message: 'Thiếu thông tin đơn hàng',
                    error: 'orderId và amount là bắt buộc' 
                });
            }

            // Validate orderId format trước khi query
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({ 
                    message: 'Mã đơn hàng không hợp lệ',
                    error: 'orderId phải là ObjectId hợp lệ' 
                });
            }

            // Kiểm tra đơn hàng
            const order = await DonHang.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            // Tính tổng tiền bao gồm phí vận chuyển
            const totalAmount = (order.TongTien || 0) + (order.PhiVanChuyen || 0);
            
            // Validate amount matches order total
            if (Math.abs(amount - totalAmount) > 0.01) {
                console.warn(`Amount mismatch: provided=${amount}, calculated=${totalAmount}`);
            }

            // VNPay Config (lấy từ env hoặc config)
            // Đăng ký tại: http://sandbox.vnpayment.vn/devreg/
            const vnp_TmnCode = process.env.VNPAY_TMN_CODE || 'DEMOV210';
            const vnp_HashSecret = process.env.VNPAY_HASH_SECRET || '';
            const vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
            const vnp_ReturnUrl = process.env.VNPAY_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return`;
            const vnp_IpnUrl = process.env.VNPAY_IPN_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/vnpay/ipn`;
            
            if (!vnp_TmnCode || !vnp_HashSecret) {
                return res.status(500).json({
                    message: 'Cấu hình VNPAY chưa đầy đủ',
                    error: 'VNPAY_TMN_CODE và VNPAY_HASH_SECRET là bắt buộc'
                });
            }

            // Tạo mã giao dịch
            // VNPay yêu cầu format: YYYYMMDDHHmmss (14 ký tự số)
            const date = new Date();
            // Format: YYYYMMDDHHmmss
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`;
            
            // Expire date: 15 phút sau
            const expireDateObj = new Date(date.getTime() + 15 * 60 * 1000);
            const expireYear = expireDateObj.getFullYear();
            const expireMonth = String(expireDateObj.getMonth() + 1).padStart(2, '0');
            const expireDay = String(expireDateObj.getDate()).padStart(2, '0');
            const expireHours = String(expireDateObj.getHours()).padStart(2, '0');
            const expireMinutes = String(expireDateObj.getMinutes()).padStart(2, '0');
            const expireSeconds = String(expireDateObj.getSeconds()).padStart(2, '0');
            const expireDate = `${expireYear}${expireMonth}${expireDay}${expireHours}${expireMinutes}${expireSeconds}`;

            // Sử dụng orderId dạng string để tạo transaction ref
            const orderIdStr = orderId.toString();
            // vnp_TxnRef: Mã tham chiếu giao dịch (tối đa 100 ký tự, chỉ chứa chữ số, chữ cái và dấu gạch dưới)
            // Loại bỏ ký tự đặc biệt, chỉ giữ chữ số, chữ cái
            const cleanOrderId = orderIdStr.replace(/[^a-zA-Z0-9]/g, '');
            const timestamp = Date.now().toString();
            let orderId_vnpay = `${cleanOrderId}_${timestamp}`;
            if (orderId_vnpay.length > 100) {
                // Nếu quá dài, rút ngắn orderId
                const maxOrderIdLength = 100 - timestamp.length - 1; // -1 cho dấu gạch dưới
                orderId_vnpay = `${cleanOrderId.substring(0, maxOrderIdLength)}_${timestamp}`;
            }
            // Đảm bảo chỉ chứa chữ số, chữ cái và dấu gạch dưới
            orderId_vnpay = orderId_vnpay.replace(/[^a-zA-Z0-9_]/g, '');
            const amount_vnpay = Math.round(amount); // VNPay yêu cầu số nguyên

            // Lấy IP address (bắt buộc, không được null)
            const ipAddr = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                          req.ip ||
                          '127.0.0.1';

            // Xử lý vnp_OrderInfo: VNPay yêu cầu không có tiếng Việt thô, chỉ ASCII
            // Đơn giản hóa: chỉ dùng chữ cái, số, khoảng trắng
            let orderInfo = orderDescription || 'Thanh toan don hang';
            // Loại bỏ ký tự đặc biệt và tiếng Việt, chỉ giữ ASCII
            orderInfo = orderInfo
                .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/gi, 'a')
                .replace(/[èéẹẻẽêềếệểễ]/gi, 'e')
                .replace(/[ìíịỉĩ]/gi, 'i')
                .replace(/[òóọỏõôồốộổỗơờớợởỡ]/gi, 'o')
                .replace(/[ùúụủũưừứựửữ]/gi, 'u')
                .replace(/[ỳýỵỷỹ]/gi, 'y')
                .replace(/[đ]/gi, 'd')
                .replace(/[^a-zA-Z0-9\s]/g, '') // Chỉ giữ chữ cái, số, khoảng trắng
                .trim()
                .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
                .substring(0, 255);
            
            if (!orderInfo || orderInfo.length === 0) {
                orderInfo = 'Thanh toan don hang';
            }

            // Tạo params - Đảm bảo tất cả giá trị đúng format theo checklist VNPay
            let vnp_Params = {};
            
            // ✅ 1. Các trường bắt buộc
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
            vnp_Params['vnp_Locale'] = language || 'vn'; // vn hoặc en
            vnp_Params['vnp_CurrCode'] = 'VND';
            
            // ✅ 2. vnp_TxnRef: Chỉ chứa chữ số, chữ cái và dấu gạch dưới (đã xử lý ở trên)
            vnp_Params['vnp_TxnRef'] = orderId_vnpay;
            
            // ✅ 3. vnp_OrderInfo: Không có tiếng Việt thô, chỉ ASCII (đã xử lý ở trên)
            vnp_Params['vnp_OrderInfo'] = orderInfo;
            vnp_Params['vnp_OrderType'] = orderType;
            
            // ✅ 4. vnp_Amount: Phải là SỐ NGUYÊN (không phải string), nhân 100
            // Đảm bảo là số nguyên, không có dấu phẩy, dấu chấm
            vnp_Params['vnp_Amount'] = parseInt(Math.round(amount_vnpay * 100));
            
            // ✅ 5. vnp_CreateDate: Format YYYYMMDDHHmmss (14 ký tự số) - đã xử lý ở trên
            vnp_Params['vnp_CreateDate'] = createDate;
            vnp_Params['vnp_ExpireDate'] = expireDate;
            
            // ✅ 6. vnp_IpAddr: Phải có giá trị, không được null
            vnp_Params['vnp_IpAddr'] = ipAddr;
            
            // ✅ 7. URLs
            vnp_Params['vnp_ReturnUrl'] = vnp_ReturnUrl;
            // vnp_IpnUrl: Tùy chọn, có thể cấu hình trong merchant dashboard hoặc gửi trong params
            // Nếu không gửi, VNPAY sẽ sử dụng IPN URL đã cấu hình trong merchant dashboard
            if (vnp_IpnUrl) {
                vnp_Params['vnp_IpnUrl'] = vnp_IpnUrl;
            }
            
            // ✅ 8. vnp_BankCode: Tùy chọn - Mã phương thức thanh toán
            // Nếu không gửi, khách hàng sẽ chọn phương thức thanh toán tại VNPAY
            // Các giá trị: VNPAYQR (QR Code), VNBANK (ATM), INTCARD (Thẻ quốc tế)
            if (bankCode && bankCode !== '') {
                vnp_Params['vnp_BankCode'] = bankCode;
            }

            // ✅ 9. Sắp xếp params theo thứ tự alphabet (BẮT BUỘC trước khi ký)
            vnp_Params = this.sortObject(vnp_Params);

            // ✅ 10. Tạo query string để ký (KHÔNG encode khi tính signature)
            const querystring = require('querystring');
            
            // 🔥 LOG QUAN TRỌNG: vnp_Params TRƯỚC KHI KÝ
            console.log('========================================');
            console.log('🔥 VNP PARAMS BEFORE SIGN:');
            console.log('========================================');
            console.log(JSON.stringify(vnp_Params, null, 2));
            console.log('========================================');
            
            const signData = querystring.stringify(vnp_Params, { encode: false });
            
            // ✅ 11. Log chi tiết từng field
            console.log('=== VNPay Payment URL Creation - DETAILED LOG ===');
            console.log('Sign Data (string to hash):', signData);
            console.log('--- Field Details ---');
            console.log('vnp_Version:', vnp_Params['vnp_Version']);
            console.log('vnp_Command:', vnp_Params['vnp_Command']);
            console.log('vnp_TmnCode:', vnp_Params['vnp_TmnCode']);
            console.log('vnp_Amount (type):', typeof vnp_Params['vnp_Amount'], 'value:', vnp_Params['vnp_Amount']);
            console.log('vnp_CreateDate:', vnp_Params['vnp_CreateDate'], 'length:', vnp_Params['vnp_CreateDate']?.length);
            console.log('vnp_TxnRef:', vnp_Params['vnp_TxnRef'], 'type:', typeof vnp_Params['vnp_TxnRef']);
            console.log('vnp_OrderInfo:', vnp_Params['vnp_OrderInfo'], 'type:', typeof vnp_Params['vnp_OrderInfo']);
            console.log('vnp_IpAddr:', vnp_Params['vnp_IpAddr']);
            console.log('vnp_ReturnUrl:', vnp_Params['vnp_ReturnUrl']);
            console.log('Amount (VND):', amount_vnpay, '→ Amount (xu):', vnp_Params['vnp_Amount']);
            console.log('HashSecret length:', vnp_HashSecret.length);
            
            // ✅ 12. Tạo SHA512 signature (theo tài liệu VNPAY)
            const hmac = crypto.createHmac("sha512", vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
            vnp_Params['vnp_SecureHash'] = signed;
            
            console.log('SecureHash (first 20 chars):', signed.substring(0, 20) + '...');
            console.log('SecureHash (full):', signed);
            
            // ✅ 13. Tạo URL cuối cùng
            // Lưu ý quan trọng:
            // - Signature đã được tính trên giá trị GỐC (không encode) ✅
            // - Khi tạo URL, VNPay yêu cầu encode các giá trị để URL hợp lệ
            // - Nhưng querystring.stringify với encode: false sẽ KHÔNG encode
            // - Vì vậy ta cần encode thủ công các giá trị string
            
            // Tạo URL params với encoding đúng cách
            let urlParams = {};
            for (const key in vnp_Params) {
                if (vnp_Params[key] !== null && vnp_Params[key] !== undefined) {
                    const value = vnp_Params[key];
                    // Encode các giá trị string (đặc biệt là vnp_OrderInfo, vnp_ReturnUrl, vnp_IpnUrl)
                    // Các giá trị số không cần encode
                    if (typeof value === 'string') {
                        // Encode string values để URL hợp lệ
                        urlParams[key] = encodeURIComponent(value);
                    } else {
                        // Convert số thành string (không encode)
                        urlParams[key] = String(value);
                    }
                }
            }
            
            // Tạo query string - dùng encode: false vì ta đã encode thủ công
            const queryString = querystring.stringify(urlParams, { encode: false });
            const vnpUrl = vnp_Url + '?' + queryString;
            
            // Log để debug
            console.log('Query String (first 200 chars):', queryString.substring(0, 200));
            
            console.log('========================================');
            console.log('🔥 VNPAY URL:');
            console.log('========================================');
            console.log(vnpUrl);
            console.log('========================================');
            console.log('URL length:', vnpUrl.length);

            // Lưu thông tin payment vào đơn hàng
            await DonHang.findByIdAndUpdate(orderId, {
                $set: {
                    VNPayTransactionRef: orderId_vnpay,
                    VNPayCreateDate: createDate,
                    VNPayExpireDate: expireDate
                }
            });

            return res.status(200).json({
                message: 'Tạo URL thanh toán thành công',
                paymentUrl: vnpUrl,
                orderId: orderIdStr,
                transactionRef: orderId_vnpay
            });
        } catch (error) {
            console.error('Lỗi khi tạo URL thanh toán VNPay:', error);
            return res.status(500).json({
                message: 'Lỗi khi tạo URL thanh toán',
                error: error.message
            });
        }
    }

    /**
     * Xử lý IPN (Instant Payment Notification) từ VNPay
     * IPN là thông báo server-to-server, VNPay gọi URL này để cập nhật kết quả thanh toán
     * Khác với vnpayReturn (redirect browser), IPN được gọi trực tiếp từ server VNPay
     */
    async vnpayIpn(req, res) {
        try {
            const vnp_Params = req.query;
            const secureHash = vnp_Params['vnp_SecureHash'];
            const vnp_HashSecret = process.env.VNPAY_HASH_SECRET || '';
            
            if (!vnp_HashSecret) {
                console.error('IPN: VNPAY_HASH_SECRET not configured');
                return res.status(200).json({ RspCode: '99', Message: 'Server configuration error' });
            }

            // Loại bỏ vnp_SecureHash và vnp_SecureHashType
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            // Sắp xếp và tạo query string
            const sortedParams = this.sortObject(vnp_Params);
            const querystring = require('querystring');
            const signData = querystring.stringify(sortedParams, { encode: false });

            // Tạo hash
            const hmac = crypto.createHmac("sha512", vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

            // Xác minh chữ ký
            if (secureHash !== signed) {
                console.error('Invalid VNPay IPN signature:', { secureHash, signed });
                return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
            }

            // Extract orderId from transaction reference
            const txnRef = vnp_Params['vnp_TxnRef'];
            if (!txnRef) {
                console.error('IPN: Missing transaction reference');
                return res.status(200).json({ RspCode: '99', Message: 'Missing transaction reference' });
            }

            // vnp_TxnRef có thể là orderId hoặc orderId_timestamp
            const orderId = txnRef.includes('_') ? txnRef.split('_')[0] : txnRef;
            const rspCode = vnp_Params['vnp_ResponseCode'];
            const transactionStatus = vnp_Params['vnp_TransactionStatus'];
            const amount = parseInt(vnp_Params['vnp_Amount']) / 100; // Chuyển từ xu về VND

            // Tìm đơn hàng
            const order = await DonHang.findById(orderId);
            if (!order) {
                console.error('IPN: Order not found:', orderId);
                return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }

            // Kiểm tra số tiền (bao gồm phí vận chuyển)
            const totalAmount = (order.TongTien || 0) + (order.PhiVanChuyen || 0);
            if (Math.abs(amount - totalAmount) > 0.01) {
                console.error('IPN: Amount mismatch:', { amount, totalAmount, orderId });
                return res.status(200).json({ RspCode: '04', Message: 'Amount mismatch' });
            }

            // Kiểm tra trạng thái đơn hàng đã được xử lý chưa
            const transactionNo = vnp_Params['vnp_TransactionNo'];
            if (order.TrangThaiThanhToan === 'paid' && order.VNPayTransactionId === transactionNo) {
                // Đơn hàng đã được xử lý rồi, trả về thành công
                console.log('IPN: Order already processed:', orderId);
                return res.status(200).json({ RspCode: '00', Message: 'Success' });
            }

            // Xử lý kết quả thanh toán
            // Theo tài liệu VNPAY:
            // - vnp_ResponseCode = '00': Giao dịch thành công
            // - vnp_TransactionStatus = '00': Giao dịch thanh toán được thực hiện thành công tại VNPAY
            if (rspCode === '00' && transactionStatus === '00') {
                // Thanh toán thành công
                await DonHang.findByIdAndUpdate(orderId, {
                    $set: {
                        TrangThaiThanhToan: 'paid',
                        TrangThai: 'confirmed',
                        VNPayResponseCode: rspCode,
                        VNPayTransactionStatus: transactionStatus,
                        VNPayTransactionId: transactionNo || null,
                        VNPayBankCode: vnp_Params['vnp_BankCode'] || null,
                        VNPayBankTranNo: vnp_Params['vnp_BankTranNo'] || null,
                        VNPayCardType: vnp_Params['vnp_CardType'] || null,
                        VNPayPayDate: vnp_Params['vnp_PayDate'] || null
                    }
                });

                console.log('IPN: Payment successful for order:', orderId);
                // RspCode: 00, 02 là mã lỗi IPN của merchant phản hồi đã cập nhật được tình trạng giao dịch
                return res.status(200).json({ RspCode: '00', Message: 'Success' });
            } else {
                // Thanh toán thất bại hoặc chưa hoàn tất
                await DonHang.findByIdAndUpdate(orderId, {
                    $set: {
                        TrangThaiThanhToan: 'failed',
                        VNPayResponseCode: rspCode,
                        VNPayTransactionStatus: transactionStatus,
                        VNPayResponseMessage: this.getResponseMessage(rspCode)
                    }
                });

                console.log('IPN: Payment failed for order:', orderId, 'ResponseCode:', rspCode, 'TransactionStatus:', transactionStatus);
                // Vẫn trả về 00 để VNPay biết đã nhận được và cập nhật trạng thái
                return res.status(200).json({ RspCode: '00', Message: 'Success' });
            }
        } catch (error) {
            console.error('Lỗi khi xử lý IPN VNPay:', error);
            return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
        }
    }

    /**
     * Xử lý callback từ VNPay (Return URL - redirect browser)
     * Đây là URL mà khách hàng được chuyển hướng về sau khi thanh toán
     */
    async vnpayReturn(req, res) {
        try {
            const vnp_Params = req.query;
            const secureHash = vnp_Params['vnp_SecureHash'];
            const vnp_HashSecret = process.env.VNPAY_HASH_SECRET || '';
            
            if (!vnp_HashSecret) {
                console.error('Return: VNPAY_HASH_SECRET not configured');
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=fail&message=Server configuration error`);
            }

            // Loại bỏ vnp_SecureHash và vnp_SecureHashType
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];

            // Sắp xếp và tạo query string
            const sortedParams = this.sortObject(vnp_Params);
            const querystring = require('querystring');
            const signData = querystring.stringify(sortedParams, { encode: false });

            // Tạo hash
            const hmac = crypto.createHmac("sha512", vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

            // Xác minh chữ ký
            if (secureHash !== signed) {
                console.error('Invalid VNPay Return signature:', { secureHash, signed });
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=fail&message=Invalid signature`);
            }

            // Extract orderId from transaction reference (format: orderId_timestamp)
            const txnRef = vnp_Params['vnp_TxnRef'];
            if (!txnRef) {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=fail&message=Missing transaction reference`);
            }

            // vnp_TxnRef có thể là orderId hoặc orderId_timestamp
            const orderId = txnRef.includes('_') ? txnRef.split('_')[0] : txnRef;
            const rspCode = vnp_Params['vnp_ResponseCode'];
            const transactionStatus = vnp_Params['vnp_TransactionStatus'];
            const amount = parseInt(vnp_Params['vnp_Amount']) / 100; // Chuyển từ xu về VND

            // Tìm đơn hàng
            const order = await DonHang.findById(orderId);
            if (!order) {
                console.error('Order not found:', orderId);
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=fail&message=Order not found`);
            }

            // Kiểm tra số tiền (bao gồm phí vận chuyển)
            const totalAmount = (order.TongTien || 0) + (order.PhiVanChuyen || 0);
            if (Math.abs(amount - totalAmount) > 0.01) {
                console.error('Amount mismatch:', { amount, totalAmount, orderId });
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=fail&message=Amount mismatch`);
            }

            // Xử lý kết quả thanh toán
            // Lưu ý: Return URL chỉ kiểm tra checksum và hiển thị thông báo
            // Không cập nhật kết quả giao dịch tại địa chỉ này (để IPN xử lý)
            // Nhưng vẫn cập nhật để đảm bảo dữ liệu đồng bộ nếu IPN chưa được gọi
            if (rspCode === '00' && transactionStatus === '00') {
                // Thanh toán thành công
                await DonHang.findByIdAndUpdate(orderId, {
                    $set: {
                        TrangThaiThanhToan: 'paid',
                        TrangThai: 'confirmed',
                        VNPayResponseCode: rspCode,
                        VNPayTransactionStatus: transactionStatus,
                        VNPayTransactionId: vnp_Params['vnp_TransactionNo'] || null,
                        VNPayBankCode: vnp_Params['vnp_BankCode'] || null,
                        VNPayBankTranNo: vnp_Params['vnp_BankTranNo'] || null,
                        VNPayCardType: vnp_Params['vnp_CardType'] || null,
                        VNPayPayDate: vnp_Params['vnp_PayDate'] || null
                    }
                });

                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=success&orderId=${orderId}`);
            } else {
                // Thanh toán thất bại
                await DonHang.findByIdAndUpdate(orderId, {
                    $set: {
                        TrangThaiThanhToan: 'failed',
                        VNPayResponseCode: rspCode,
                        VNPayTransactionStatus: transactionStatus,
                        VNPayResponseMessage: this.getResponseMessage(rspCode)
                    }
                });

                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=fail&orderId=${orderId}&code=${rspCode}`);
            }
        } catch (error) {
            console.error('Lỗi khi xử lý callback VNPay:', error);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return?status=fail&message=Server error`);
        }
    }

    /**
     * Tạo QR code cho VNPay QR
     */
    async createQRCode(req, res) {
        try {
            const { orderId, amount, orderDescription } = req.body;
            // Không yêu cầu userId vì có thể là guest checkout

            if (!orderId || !amount) {
                return res.status(400).json({ 
                    message: 'Thiếu thông tin đơn hàng',
                    error: 'orderId và amount là bắt buộc' 
                });
            }

            // Validate orderId format trước khi query
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({ 
                    message: 'Mã đơn hàng không hợp lệ',
                    error: 'orderId phải là ObjectId hợp lệ' 
                });
            }

            // Kiểm tra đơn hàng
            const order = await DonHang.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            // Tính tổng tiền bao gồm phí vận chuyển
            const totalAmount = (order.TongTien || 0) + (order.PhiVanChuyen || 0);
            
            // Validate amount matches order total
            if (Math.abs(amount - totalAmount) > 0.01) {
                console.warn(`Amount mismatch: provided=${amount}, calculated=${totalAmount}`);
            }

            // Tạo payment URL (giống như createPaymentUrl nhưng với bankCode = VNPAYQR)
            const vnp_TmnCode = process.env.VNPAY_TMN_CODE || 'DEMOV210';
            const vnp_HashSecret = process.env.VNPAY_HASH_SECRET || '';
            const vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
            const vnp_ReturnUrl = process.env.VNPAY_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/vnpay-return`;
            const vnp_IpnUrl = process.env.VNPAY_IPN_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/vnpay/ipn`;
            
            if (!vnp_TmnCode || !vnp_HashSecret) {
                return res.status(500).json({
                    message: 'Cấu hình VNPAY chưa đầy đủ',
                    error: 'VNPAY_TMN_CODE và VNPAY_HASH_SECRET là bắt buộc'
                });
            }

            // VNPay yêu cầu format: YYYYMMDDHHmmss (14 ký tự số)
            const date = new Date();
            // Format: YYYYMMDDHHmmss
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`;
            
            // Expire date: 15 phút sau
            const expireDateObj = new Date(date.getTime() + 15 * 60 * 1000);
            const expireYear = expireDateObj.getFullYear();
            const expireMonth = String(expireDateObj.getMonth() + 1).padStart(2, '0');
            const expireDay = String(expireDateObj.getDate()).padStart(2, '0');
            const expireHours = String(expireDateObj.getHours()).padStart(2, '0');
            const expireMinutes = String(expireDateObj.getMinutes()).padStart(2, '0');
            const expireSeconds = String(expireDateObj.getSeconds()).padStart(2, '0');
            const expireDate = `${expireYear}${expireMonth}${expireDay}${expireHours}${expireMinutes}${expireSeconds}`;

            // Sử dụng orderId dạng string để tạo transaction ref
            const orderIdStr = orderId.toString();
            // vnp_TxnRef: Mã tham chiếu giao dịch (tối đa 100 ký tự, chỉ chứa chữ số, chữ cái và dấu gạch dưới)
            // Loại bỏ ký tự đặc biệt, chỉ giữ chữ số, chữ cái
            const cleanOrderId = orderIdStr.replace(/[^a-zA-Z0-9]/g, '');
            const timestamp = Date.now().toString();
            let orderId_vnpay = `${cleanOrderId}_${timestamp}`;
            if (orderId_vnpay.length > 100) {
                // Nếu quá dài, rút ngắn orderId
                const maxOrderIdLength = 100 - timestamp.length - 1; // -1 cho dấu gạch dưới
                orderId_vnpay = `${cleanOrderId.substring(0, maxOrderIdLength)}_${timestamp}`;
            }
            // Đảm bảo chỉ chứa chữ số, chữ cái và dấu gạch dưới
            orderId_vnpay = orderId_vnpay.replace(/[^a-zA-Z0-9_]/g, '');
            const amount_vnpay = Math.round(amount);

            // Lấy IP address (bắt buộc, không được null)
            const ipAddr = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                          req.ip ||
                          '127.0.0.1';

            // Xử lý vnp_OrderInfo: VNPay yêu cầu không có tiếng Việt thô, chỉ ASCII
            // Đơn giản hóa: chỉ dùng chữ cái, số, khoảng trắng
            let orderInfo = orderDescription || 'Thanh toan don hang';
            // Loại bỏ ký tự đặc biệt và tiếng Việt, chỉ giữ ASCII
            orderInfo = orderInfo
                .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/gi, 'a')
                .replace(/[èéẹẻẽêềếệểễ]/gi, 'e')
                .replace(/[ìíịỉĩ]/gi, 'i')
                .replace(/[òóọỏõôồốộổỗơờớợởỡ]/gi, 'o')
                .replace(/[ùúụủũưừứựửữ]/gi, 'u')
                .replace(/[ỳýỵỷỹ]/gi, 'y')
                .replace(/[đ]/gi, 'd')
                .replace(/[^a-zA-Z0-9\s]/g, '') // Chỉ giữ chữ cái, số, khoảng trắng
                .trim()
                .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
                .substring(0, 255);
            
            if (!orderInfo || orderInfo.length === 0) {
                orderInfo = 'Thanh toan don hang';
            }

            // Tạo params - Đảm bảo tất cả giá trị đúng format theo checklist VNPay
            let vnp_Params = {};
            
            // ✅ 1. Các trường bắt buộc
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
            vnp_Params['vnp_Locale'] = 'vn';
            vnp_Params['vnp_CurrCode'] = 'VND';
            
            // ✅ 2. vnp_TxnRef: Chỉ chứa chữ số, chữ cái và dấu gạch dưới
            vnp_Params['vnp_TxnRef'] = orderId_vnpay;
            
            // ✅ 3. vnp_OrderInfo: Không có tiếng Việt thô, chỉ ASCII
            vnp_Params['vnp_OrderInfo'] = orderInfo;
            vnp_Params['vnp_OrderType'] = 'other';
            
            // ✅ 4. vnp_Amount: Phải là SỐ NGUYÊN (không phải string), nhân 100
            vnp_Params['vnp_Amount'] = parseInt(Math.round(amount_vnpay * 100));
            
            // ✅ 5. vnp_CreateDate: Format YYYYMMDDHHmmss (14 ký tự số)
            vnp_Params['vnp_CreateDate'] = createDate;
            vnp_Params['vnp_ExpireDate'] = expireDate;
            
            // ✅ 6. vnp_IpAddr: Phải có giá trị, không được null
            vnp_Params['vnp_IpAddr'] = ipAddr;
            
            // ✅ 7. URLs
            vnp_Params['vnp_ReturnUrl'] = vnp_ReturnUrl;
            vnp_Params['vnp_IpnUrl'] = vnp_IpnUrl;
            
            // ✅ 8. BankCode cho QR
            vnp_Params['vnp_BankCode'] = 'VNPAYQR'; // QR Code

            // ✅ 9. Sắp xếp params theo thứ tự alphabet (BẮT BUỘC trước khi ký)
            vnp_Params = this.sortObject(vnp_Params);

            // ✅ 10. Tạo query string để ký (KHÔNG encode khi tính signature)
            const querystring = require('querystring');
            const signData = querystring.stringify(vnp_Params, { encode: false });
            
            // ✅ 11. Log toàn bộ params để debug
            console.log('=== VNPay QR Code URL Creation - FULL PARAMS ===');
            console.log('All vnp_Params BEFORE signing:', JSON.stringify(vnp_Params, null, 2));
            console.log('Sign Data (string to hash):', signData);
            console.log('vnp_Amount (type):', typeof vnp_Params['vnp_Amount'], 'value:', vnp_Params['vnp_Amount']);
            console.log('vnp_CreateDate:', vnp_Params['vnp_CreateDate'], 'length:', vnp_Params['vnp_CreateDate'].length);
            
            // ✅ 12. Tạo SHA512 signature
            const hmac = crypto.createHmac("sha512", vnp_HashSecret);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
            vnp_Params['vnp_SecureHash'] = signed;
            
            // ✅ 13. Tạo URL cuối cùng - VNPay yêu cầu KHÔNG encode (theo mẫu chuẩn)
            const vnpUrl = vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });
            
            console.log('VNPay QR URL created successfully');
            
            // Log để debug
            console.log('VNPay QR Code URL created:', {
                orderId: orderIdStr,
                amount: amount_vnpay,
                orderInfo: orderInfo,
                txnRef: orderId_vnpay,
                signDataLength: signData.length
            });

            // Lưu thông tin payment
            await DonHang.findByIdAndUpdate(orderId, {
                $set: {
                    VNPayTransactionRef: orderId_vnpay,
                    VNPayCreateDate: createDate,
                    VNPayExpireDate: expireDate
                }
            });

            // Tạo QR code từ URL (cần package qrcode)
            const QRCode = require('qrcode');
            const qrCodeDataUrl = await QRCode.toDataURL(vnpUrl);

            return res.status(200).json({
                message: 'Tạo QR code thành công',
                qrCode: qrCodeDataUrl,
                paymentUrl: vnpUrl,
                orderId: orderIdStr,
                transactionRef: orderId_vnpay
            });
        } catch (error) {
            console.error('Lỗi khi tạo QR code VNPay:', error);
            return res.status(500).json({
                message: 'Lỗi khi tạo QR code',
                error: error.message
            });
        }
    }

    /**
     * Sắp xếp object theo key (theo yêu cầu của VNPay)
     * VNPay yêu cầu sắp xếp theo key gốc, không phải key đã encode
     */
    sortObject(obj) {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            sorted[key] = obj[key];
        }
        
        return sorted;
    }

    /**
     * Lấy thông báo lỗi từ response code
     * Theo bảng mã lỗi của VNPAY
     */
    getResponseMessage(code) {
        const messages = {
            '00': 'Giao dịch thành công',
            '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
            '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng',
            '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
            '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch',
            '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
            '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch',
            '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
            '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
            '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
            '75': 'Ngân hàng thanh toán đang bảo trì',
            '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
            '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
        };
        return messages[code] || `Lỗi không xác định (Code: ${code})`;
    }
    
    /**
     * Lấy thông báo từ transaction status
     */
    getTransactionStatusMessage(status) {
        const messages = {
            '00': 'Giao dịch thanh toán được thực hiện thành công tại VNPAY',
            '01': 'Giao dịch chưa hoàn tất',
            '02': 'Giao dịch bị lỗi',
            '04': 'Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)',
            '05': 'VNPAY đang xử lý giao dịch này (GD hoàn tiền)',
            '06': 'VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)',
            '07': 'Giao dịch bị nghi ngờ gian lận',
            '09': 'GD Hoàn trả bị từ chối'
        };
        return messages[status] || `Trạng thái không xác định (Status: ${status})`;
    }
}

// Create instance and bind methods to preserve 'this' context
const controller = new VNPayController();

// Bind methods to ensure 'this' context is preserved when used as route handlers
controller.createPaymentUrl = controller.createPaymentUrl.bind(controller);
controller.vnpayReturn = controller.vnpayReturn.bind(controller);
controller.vnpayIpn = controller.vnpayIpn.bind(controller);
controller.createQRCode = controller.createQRCode.bind(controller);

module.exports = controller;

