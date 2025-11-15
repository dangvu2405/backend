const TaiKhoan = require('../models/Taikhoan');
const Role = require('../models/Role');
const Session = require('../models/Session');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendWelcomeEmail, sendEmail } = require('../../utils/email');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateTokenPair, generateToken } = require('../../utils/token');
const { successResponse, errorResponse } = require('../../utils/response');
const { HTTP_STATUS, MESSAGES, JWT } = require('../../constants');
class AuthController {
    // đăng nhập
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return errorResponse(res, MESSAGES.ERROR, HTTP_STATUS.BAD_REQUEST);
            }
            // Tìm user theo email hoặc username
            const user = await TaiKhoan.findOne({
                $or: [{ Email: username.toLowerCase() }, { TenDangNhap: username }]
            });
            if (!user) {
                return errorResponse(res, MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
            }
            // kiểm tra xem mật khẩu có khớp chưa
            const isMatch = await comparePassword(password, user.MatKhau);
            if (!isMatch) {
                return errorResponse(res, MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
            }
            // tạo token pair
            const tokens = generateTokenPair(user);
            // tạo refresh token
            const refreshToken = crypto.randomBytes(32).toString('hex');
            const session = await Session.create({
                userId: user._id,
                refreshToken: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            // lưu refresh token vào database
            await session.save();
            // gửi refresh token về trong cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                maxAge: 7 * 24 * 60 * 60 * 1000 
            });
            // trả access token về trong response
            // Trả về cả accessToken ở root level để tương thích với frontend
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Đăng nhập thành công',
                accessToken: tokens.accessToken,
                data: {
                    accessToken: tokens.accessToken,
                    user: {
                        id: user._id,
                        TenDangNhap: user.TenDangNhap,
                        HoTen: user.HoTen,
                        Email: user.Email,
                        MaVaiTro: user.MaVaiTro
                    }
                }
            });
        } catch (error) {
            console.error('Lỗi khi đăng nhập: ', error);
            return errorResponse(res, 'Lỗi khi đăng nhập', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    // tạo tài khoản mới
    async register(req, res) {
        try {
            const { hoten, username, email, password, sdt } = req.body;
            // kiểm tra xem thông tin đã được nhập đầy đủ chưa
            if (!hoten || !username || !email || !password || !sdt) {
                return errorResponse(res, 'Vui lòng nhập đầy đủ thông tin', HTTP_STATUS.BAD_REQUEST);
            }
            // kiểm tra tài khoản tồn tại chưa, nếu tồn tại thì trả về lỗi
            const user = await TaiKhoan.findOne({ 
                $or: [{ Email: email.toLowerCase() }, { TenDangNhap: username }] 
            });
            if (user) {
                return errorResponse(res, MESSAGES.USER_EXISTS, HTTP_STATUS.BAD_REQUEST);
            }
            // Lấy role Customer mặc định
            const customerRole = await Role.getCustomerRole();
            if (!customerRole) {
                return errorResponse(res, 'Không tìm thấy vai trò Customer', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }
            const hashedPassword = await hashPassword(password);
            // Tạo tài khoản mới
            const newUser = new TaiKhoan({ 
                HoTen: hoten, 
                TenDangNhap: username, 
                Email: email.toLowerCase(), 
                MatKhau: hashedPassword,
                MaVaiTro: customerRole._id,
                SoDienThoai: sdt
            });
            // tạo tài khoản mới
            await newUser.save();
            
            // Gửi email chào mừng
            try {
                await sendWelcomeEmail(newUser.Email, newUser.HoTen || newUser.TenDangNhap);
            } catch (emailError) {
                console.error('Lỗi khi gửi email chào mừng:', emailError);
            }
            
            // Tạo token pair cho user mới (tự động đăng nhập sau khi đăng ký)
            const tokens = generateTokenPair(newUser);
            
            // Tạo refresh token
            const refreshToken = crypto.randomBytes(32).toString('hex');
            const session = await Session.create({
                userId: newUser._id,
                refreshToken: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            await session.save();
            
            // Gửi refresh token về trong cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                maxAge: 7 * 24 * 60 * 60 * 1000 
            });
            
            // Trả về cả accessToken ở root level để tương thích với frontend
            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Tạo tài khoản thành công',
                accessToken: tokens.accessToken,
                data: {
                    accessToken: tokens.accessToken,
                    user: {
                        id: newUser._id,
                        TenDangNhap: newUser.TenDangNhap,
                        HoTen: newUser.HoTen,
                        Email: newUser.Email
                    }
                }
            });
        } catch (error) {
            console.error('Lỗi khi tạo tài khoản: ', error);
            return errorResponse(res, 'Lỗi khi tạo tài khoản', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    // đăng xuất
    async logout(req, res) {
        try {
            const { refreshToken } = req.cookies;
            
            // Nếu có refreshToken, xóa session
            if (refreshToken) {
                try {
                    await Session.findOneAndDelete({ refreshToken });
                } catch (sessionError) {
                    console.error('Lỗi khi xóa session:', sessionError);
                    // Tiếp tục logout dù có lỗi xóa session
                }
            }
            
            // Clear refreshToken cookie
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });
            
            // Trả về success dù có refreshToken hay không
            // Frontend sẽ tự clear storage
            return successResponse(res, null, 'Đăng xuất thành công', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi đăng xuất: ', error);
            // Vẫn trả về success để frontend có thể clear storage
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });
            return successResponse(res, null, 'Đăng xuất thành công', HTTP_STATUS.OK);
        }
    }
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.cookies;
            if (!refreshToken) {
                return errorResponse(res, 'Không tìm thấy refresh token', HTTP_STATUS.UNAUTHORIZED);
            }
            
            const session = await Session.findOne({ refreshToken }).populate('userId');
            if (!session) {
                return errorResponse(res, 'Không tìm thấy session', HTTP_STATUS.UNAUTHORIZED);
            }
            if (session.expiresAt < Date.now()) {
                return errorResponse(res, 'Refresh token đã hết hạn', HTTP_STATUS.UNAUTHORIZED);
            }
            
            const user = await TaiKhoan.findById(session.userId);
            if (!user) {
                return errorResponse(res, MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            }
            
            const tokens = generateTokenPair(user);
            // Trả về cả accessToken ở root level để tương thích với frontend
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Token đã được làm mới',
                accessToken: tokens.accessToken,
                data: {
                    accessToken: tokens.accessToken
                }
            });
        }
        catch (error) {
            console.error('Lỗi khi làm mới token: ', error);
            return errorResponse(res, 'Lỗi khi làm mới token', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async sendEmail(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return errorResponse(res, 'Vui lòng cung cấp email', HTTP_STATUS.BAD_REQUEST);
            }
            
            const result = await sendEmail(email, 'Xác nhận email', 'Xin chào, đây là email xác nhận từ hệ thống của chúng tôi');
            
            if (!result.success) {
                return errorResponse(res, 'Không thể gửi email', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }
            
            return successResponse(res, null, 'Email đã được gửi', HTTP_STATUS.OK);
        } catch (error) {
            console.error('Lỗi khi gửi email: ', error);
            return errorResponse(res, 'Lỗi khi gửi email', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async forgetPassword(req, res) {
        try {
            const { email } = req.body;
            const user = await TaiKhoan.findOne({ Email: email });
            if (!user) {
                return errorResponse(res, MESSAGES.USER_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
            }
            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
            await user.save({ validateBeforeSave: false });
            
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password`;
            await sendPasswordResetEmail(user.Email, resetToken, resetUrl);
            
            return successResponse(res, null, 'Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn.', HTTP_STATUS.OK);
        }
        catch (error) {
            console.error('Lỗi khi quên mật khẩu: ', error);
            return errorResponse(res, 'Lỗi khi quên mật khẩu', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    async sendPasswordResetEmail(req, res) {
      try {
        const { email } = req.body;
        const user = await TaiKhoan.findOne({ Email: email.toLowerCase() });
        if (!user) {
          return successResponse(res, null, 'Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn.', HTTP_STATUS.OK);
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
        await user.save({ validateBeforeSave: false });
    
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password`;
        await sendPasswordResetEmail(user.Email, resetToken, resetUrl);
    
        return successResponse(res, null, 'Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn.', HTTP_STATUS.OK);
      } catch (error) {
        console.error('Lỗi khi gửi email đặt lại mật khẩu:', error);
        return errorResponse(res, 'Không thể gửi email đặt lại mật khẩu', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }
    async resetPassword(req, res) {
        try {
            const { password, token } = req.body;
            const resetToken = token || req.params.token;
            
            if (!resetToken || !password) {
                return errorResponse(res, 'Token và mật khẩu mới là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }
            
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            const user = await TaiKhoan.findOne({ 
                resetPasswordToken: hashedToken,
                resetPasswordExpire: { $gt: Date.now() }
            });
            
            if (!user) {
                return errorResponse(res, 'Token không hợp lệ hoặc đã hết hạn', HTTP_STATUS.BAD_REQUEST);
            }
            
            user.MatKhau = await hashPassword(password);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            
            return successResponse(res, null, 'Đặt lại mật khẩu thành công', HTTP_STATUS.OK);
        }
        catch (error) {
            console.error('Lỗi khi đặt lại mật khẩu: ', error);
            return errorResponse(res, 'Lỗi khi đặt lại mật khẩu', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    // OAuth Callback - xử lý sau khi đăng nhập thành công bằng Facebook/Google
    async oauthCallback(req, res) {
        try {
            const user = req.user; // User từ passport strategy
            
            if (!user) {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
            }

            // Tạo token pair
            const tokens = generateTokenPair(user);

            // Tạo refresh token
            const refreshToken = crypto.randomBytes(32).toString('hex');
            const session = await Session.create({
                userId: user._id,
                refreshToken: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            await session.save();

            // Redirect về frontend với token trong query string hoặc hash
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${refreshToken}`;
            
            return res.redirect(redirectUrl);
        } catch (error) {
            console.error('Lỗi khi xử lý OAuth callback: ', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/login?error=oauth_error`);
        }
    }

    // OAuth Error handler
    async oauthError(req, res) {
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        } catch (error) {
            console.error('Lỗi khi xử lý OAuth error: ', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/login?error=oauth_error`);
        }
    }
}
module.exports = new AuthController();