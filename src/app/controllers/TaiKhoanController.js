const Role = require('../models/Role');
const mongoose = require('mongoose');
const TaiKhoan = require('../models/Taikhoan');
const DonHang = require('../models/DonHang');
const { hashPassword, comparePassword } = require('../../utils/password');
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const { HTTP_STATUS, MESSAGES, PAGINATION } = require('../../constants');

class TaiKhoanController {
    // tạo tài khoản mới
    async createUser(req, res) {
        try {
            const { 
                hoten, 
                tenDangNhap, 
                email, 
                matKhau, 
                sdt, 
                trangThai, 
                maVaiTro, 
                gioiTinh, 
                ngaySinh 
            } = req.body;

            // Validate required fields
            if (!hoten || !tenDangNhap || !email || !matKhau || !maVaiTro) {
                return res.status(400).json({ 
                    message: 'Vui lòng nhập đầy đủ thông tin bắt buộc: HoTen, TenDangNhap, Email, MatKhau, MaVaiTro' 
                });
            }

            // Check if username or email already exists
            const existingUser = await TaiKhoan.findOne({
                $or: [
                    { TenDangNhap: tenDangNhap },
                    { Email: email.toLowerCase() }
                ]
            });

            if (existingUser) {
                return res.status(400).json({ 
                    message: existingUser.TenDangNhap === tenDangNhap 
                        ? 'Tên đăng nhập đã tồn tại' 
                        : 'Email đã được sử dụng' 
                });
            }

            // Hash password
            const hashedPassword = await hashPassword(matKhau);

            // Prepare user data
            const userData = {
                HoTen: hoten.trim(),
                TenDangNhap: tenDangNhap.trim(),
                Email: email.toLowerCase().trim(),
                MatKhau: hashedPassword,
                SoDienThoai: sdt ? sdt.trim() : '',
                TrangThai: trangThai || 'active',
                MaVaiTro: maVaiTro,
                GioiTinh: gioiTinh || null,
                NgaySinh: ngaySinh ? new Date(ngaySinh) : null,
                DiaChi: []
            };

            const user = await TaiKhoan.create(userData);
            
            // Remove password from response
            const userResponse = user.toObject();
            delete userResponse.MatKhau;

            return res.status(201).json({ 
                message: 'Tài khoản đã được tạo thành công',
                data: userResponse 
            });
        } catch (error) {
            console.error('Lỗi khi tạo tài khoản: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi tạo tài khoản', 
                error: error.message 
            });
        }
    }
    async update(req, res) {
        try {
            const userId = req.params.id;
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            const {
                hoten,
                tenDangNhap,
                email,
                sdt,
                trangThai,
                maVaiTro,
                gioiTinh,
                ngaySinh,
                // Support old field names for backward compatibility
                username,
                fullName,
                phone,
                birthday,
                gender
            } = req.body || {};

            const update = {};

            // Map to schema fields (new format)
            if (hoten !== undefined) update.HoTen = String(hoten).trim();
            if (fullName !== undefined) update.HoTen = String(fullName).trim(); // backward compatibility
            
            if (tenDangNhap !== undefined) update.TenDangNhap = String(tenDangNhap).trim();
            if (username !== undefined) update.TenDangNhap = String(username).trim(); // backward compatibility
            
            if (email !== undefined) update.Email = String(email).toLowerCase().trim();
            
            if (sdt !== undefined) update.SoDienThoai = String(sdt).trim();
            if (phone !== undefined) update.SoDienThoai = String(phone).trim(); // backward compatibility
            
            if (trangThai !== undefined) update.TrangThai = trangThai;
            
            if (maVaiTro !== undefined) update.MaVaiTro = maVaiTro;
            
            if (gioiTinh !== undefined) update.GioiTinh = gioiTinh || null;
            if (gender !== undefined) update.GioiTinh = gender || null; // backward compatibility
            
            if (ngaySinh !== undefined) update.NgaySinh = ngaySinh ? new Date(ngaySinh) : null;
            if (birthday !== undefined) update.NgaySinh = birthday ? new Date(birthday) : null; // backward compatibility

            // Handle password update if provided
            if (req.body.matKhau || req.body.password) {
                const password = req.body.matKhau || req.body.password;
                update.MatKhau = await bcrypt.hash(password, 10);
            }

            if (Object.keys(update).length === 0) {
                return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
            }

            // Check for duplicate username or email if updating
            if (update.TenDangNhap || update.Email) {
                const existingUser = await TaiKhoan.findOne({
                    _id: { $ne: userId },
                    $or: [
                        update.TenDangNhap ? { TenDangNhap: update.TenDangNhap } : {},
                        update.Email ? { Email: update.Email } : {}
                    ]
                });

                if (existingUser) {
                    return res.status(400).json({ 
                        message: existingUser.TenDangNhap === update.TenDangNhap 
                            ? 'Tên đăng nhập đã tồn tại' 
                            : 'Email đã được sử dụng' 
                    });
                }
            }

            const user = await TaiKhoan.findByIdAndUpdate(
                userId,
                { $set: update },
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            return res.status(200).json({ 
                success: true, 
                message: 'Thông tin tài khoản đã được cập nhật', 
                data: user 
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin tài khoản: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi cập nhật thông tin tài khoản', 
                error: error.message 
            });
        }
    }
    async delete(req, res) {
        try {
            const userId = req.params.id;
            if (!userId) {
                return res.status(400).json({ message: 'Thiếu ID tài khoản' });
            }

            const user = await TaiKhoan.findByIdAndDelete(userId)
                .select('-MatKhau')   
                .lean();
            
            return res.status(200).json({ 
                message: 'Tài khoản đã được xóa', 
                data: user 
            });
        } catch (error) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const [users, total] = await Promise.all([
                TaiKhoan.find()
                    .select('-MatKhau') // Exclude password
                    .populate('MaVaiTro', 'TenVaiTro MoTa')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                TaiKhoan.countDocuments()
            ]);

            return paginatedResponse(res, users, page, limit, total);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách tài khoản: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi lấy danh sách tài khoản', 
                error: error.message 
            });
        }
    }
    async deleteUserById(req, res) {
        try {   
            const userId = req.params.id;
            if (!userId) {
                return res.status(400).json({ message: 'Thiếu ID tài khoản' });
            }

            const user = await TaiKhoan.findByIdAndDelete(userId)
                .select('-MatKhau')
                .lean();
            
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            return res.status(200).json({ 
                message: 'Tài khoản đã được xóa thành công', 
                data: user 
            });
        } catch (error) {
            console.error('Lỗi khi xóa tài khoản: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi xóa tài khoản', 
                error: error.message 
            });
        }
    }
    // GET /me	thông tin tài khoản của người dùng
    async getMe(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            const user = await TaiKhoan.findById(userId)
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            return res.status(200).json({ 
                message: 'Thông tin tài khoản đã được lấy', 
                data: user 
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông tin tài khoản: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi lấy thông tin tài khoản', 
                error: error.message 
            });
        }
    }
    async uploadAvatar(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            // Kiểm tra file upload
            if (!req.file) {
                return res.status(400).json({ message: 'Vui lòng chọn file ảnh để upload' });
            }

            const cloudinaryService = require('../../services/cloudinary.service');
            let avatarUrl;

            // Upload lên Cloudinary nếu được cấu hình
            if (cloudinaryService.isCloudinaryConfigured()) {
                try {
                    // Upload từ buffer (memory storage)
                    const result = await cloudinaryService.uploadFromBuffer(req.file.buffer, {
                        folder: 'avatars',
                        transformation: [
                            { width: 400, height: 400, crop: 'fill', quality: 'auto' }
                        ]
                    });
                    
                    // Lưu Public ID vào database (frontend sẽ tự build URL)
                    avatarUrl = result.public_id;
                    
                    console.log('✅ Avatar uploaded to Cloudinary:', result.public_id);
                } catch (cloudinaryError) {
                    console.error('❌ Cloudinary upload failed, falling back to local:', cloudinaryError);
                    // Fallback to local storage
                    const path = require('path');
                    const fs = require('fs');
                    const uploadsDir = path.join(__dirname, '../../../uploads');
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(req.file.originalname);
                    const filename = 'avatar-' + uniqueSuffix + ext;
                    const filePath = path.join(uploadsDir, filename);
                    
                    // Save buffer to file
                    fs.writeFileSync(filePath, req.file.buffer);
                    avatarUrl = `/uploads/${filename}`;
                }
            } else {
                // Local storage (disk storage)
                avatarUrl = `/uploads/${req.file.filename}`;
            }

            // Xóa avatar cũ nếu có
            const user = await TaiKhoan.findById(userId);
            if (user && user.AvatarUrl) {
                // Nếu là Cloudinary public_id, xóa từ Cloudinary
                if (cloudinaryService.isCloudinaryConfigured() && !user.AvatarUrl.startsWith('http') && !user.AvatarUrl.startsWith('/')) {
                    try {
                        await cloudinaryService.deleteFromCloudinary(user.AvatarUrl);
                        console.log('✅ Deleted old avatar from Cloudinary');
                    } catch (err) {
                        console.error('⚠️  Error deleting old Cloudinary avatar:', err);
                    }
                } 
                // Nếu là local file, xóa file local
                else if (!user.AvatarUrl.startsWith('http') && user.AvatarUrl.startsWith('/uploads')) {
                    const fs = require('fs');
                    const path = require('path');
                    const oldAvatarPath = path.join(__dirname, '../../..', user.AvatarUrl);
                    if (fs.existsSync(oldAvatarPath)) {
                        try {
                            fs.unlinkSync(oldAvatarPath);
                        } catch (err) {
                            console.error('Lỗi khi xóa avatar cũ:', err);
                        }
                    }
                }
            }

            // Cập nhật avatar trong database
            const updatedUser = await TaiKhoan.findByIdAndUpdate(
                userId, 
                { $set: { AvatarUrl: avatarUrl } }, 
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!updatedUser) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            return res.status(200).json({ 
                message: 'Cập nhật avatar thành công',
                data: updatedUser 
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật avatar: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi cập nhật avatar', 
                error: error.message 
            });
        }
    }
    async updateUser(req, res) {
        try {
            const userId = req.user?.id || req.params?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            const {
                hoten,
                tenDangNhap,
                email,
                sdt,
                trangThai,
                maVaiTro,
                gioiTinh,
                ngaySinh,
                // Support old field names for backward compatibility
                username,
                fullName,
                phone,
                birthday,
                gender
            } = req.body || {};

            const update = {};

            // Map to schema fields (new format)
            if (hoten !== undefined) update.HoTen = String(hoten).trim();
            if (fullName !== undefined) update.HoTen = String(fullName).trim(); // backward compatibility
            
            if (tenDangNhap !== undefined) update.TenDangNhap = String(tenDangNhap).trim();
            if (username !== undefined) update.TenDangNhap = String(username).trim(); // backward compatibility
            
            if (email !== undefined) update.Email = String(email).toLowerCase().trim();
            
            if (sdt !== undefined) update.SoDienThoai = String(sdt).trim();
            if (phone !== undefined) update.SoDienThoai = String(phone).trim(); // backward compatibility
            
            if (trangThai !== undefined) update.TrangThai = trangThai;
            
            if (maVaiTro !== undefined) update.MaVaiTro = maVaiTro;
            
            if (gioiTinh !== undefined) update.GioiTinh = gioiTinh || null;
            if (gender !== undefined) update.GioiTinh = gender || null; // backward compatibility
            
            if (ngaySinh !== undefined) update.NgaySinh = ngaySinh ? new Date(ngaySinh) : null;
            if (birthday !== undefined) update.NgaySinh = birthday ? new Date(birthday) : null; // backward compatibility

            // Handle password update if provided
            if (req.body.matKhau || req.body.password) {
                const password = req.body.matKhau || req.body.password;
                update.MatKhau = await bcrypt.hash(password, 10);
            }

            if (Object.keys(update).length === 0) {
                return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
            }

            // Check for duplicate username or email if updating
            if (update.TenDangNhap || update.Email) {
                const existingUser = await TaiKhoan.findOne({
                    _id: { $ne: userId },
                    $or: [
                        update.TenDangNhap ? { TenDangNhap: update.TenDangNhap } : {},
                        update.Email ? { Email: update.Email } : {}
                    ]
                });

                if (existingUser) {
                    return res.status(400).json({ 
                        message: existingUser.TenDangNhap === update.TenDangNhap 
                            ? 'Tên đăng nhập đã tồn tại' 
                            : 'Email đã được sử dụng' 
                    });
                }
            }

            const user = await TaiKhoan.findByIdAndUpdate(
                userId,
                { $set: update },
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            return res.status(200).json({ 
                success: true, 
                message: 'Thông tin tài khoản đã được cập nhật', 
                data: user 
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin tài khoản: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi cập nhật thông tin tài khoản', 
                error: error.message 
            });
        }
    }
    async deleteUser(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            const user = await TaiKhoan.findByIdAndDelete(userId)
                .select('-MatKhau')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            return res.status(200).json({ 
                message: 'Tài khoản đã được xóa thành công',
                data: user 
            });
        } catch (error) {
            console.error('Lỗi khi xóa tài khoản: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi xóa tài khoản', 
                error: error.message 
            });
        }
    }
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword, matKhauCu, matKhauMoi } = req.body;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            const oldPass = oldPassword || matKhauCu;
            const newPass = newPassword || matKhauMoi;

            if (!oldPass || !newPass) {
                return res.status(400).json({ message: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới' });
            }

            if (newPass.length < 6) {
                return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
            }

            const user = await TaiKhoan.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            const isMatch = await comparePassword(oldPass, user.MatKhau);
            if (!isMatch) {
                return errorResponse(res, 'Mật khẩu cũ không chính xác', HTTP_STATUS.BAD_REQUEST);
            }

            // Hash new password
            const hashedPassword = await hashPassword(newPass);
            user.MatKhau = hashedPassword;
            await user.save();

            return res.status(200).json({ 
                message: 'Đổi mật khẩu thành công',
                success: true 
            });
        } catch (error) {
            console.error('Lỗi khi thay đổi mật khẩu: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi thay đổi mật khẩu', 
                error: error.message 
            });
        }
    }
    async getAddresses(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            const user = await TaiKhoan.findById(userId)
                .select('DiaChi')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            if (!user.DiaChi || user.DiaChi.length === 0) {
                return res.status(200).json({ 
                    message: 'Bạn chưa có địa chỉ giao hàng', 
                    data: [] 
                });
            }

            return res.status(200).json({ 
                message: 'Địa chỉ giao hàng đã được lấy', 
                data: user.DiaChi 
            });
        } catch (error) {
            console.error('Lỗi khi lấy địa chỉ giao hàng: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi lấy địa chỉ giao hàng', 
                error: error.message 
            });
        }
    }
    async createAddress(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            const { address } = req.body;
            if (!address) {
                return res.status(400).json({ message: 'Vui lòng cung cấp thông tin địa chỉ' });
            }

            // Validate required fields
            if (!address.HoTen || !address.SoDienThoai || !address.DiaChiChiTiet || !address.QuanHuyen || !address.TinhThanh) {
                return res.status(400).json({ 
                    message: 'Vui lòng điền đầy đủ: HoTen, SoDienThoai, DiaChiChiTiet, QuanHuyen, TinhThanh' 
                });
            }

            const user = await TaiKhoan.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
            }

            if (user.DiaChi && user.DiaChi.length >= 5) {
                return res.status(400).json({ message: 'Bạn đã đạt số lượng địa chỉ tối đa (5 địa chỉ)' });
            }

            // Prepare address data
            const newAddress = {
                HoTen: address.HoTen.trim(),
                SoDienThoai: address.SoDienThoai.trim(),
                DiaChiChiTiet: address.DiaChiChiTiet.trim(),
                PhuongXa: address.PhuongXa?.trim() || '',
                QuanHuyen: address.QuanHuyen.trim(),
                TinhThanh: address.TinhThanh.trim(),
                MacDinh: address.MacDinh || false
            };

            // If this is set as default, unset others
            if (newAddress.MacDinh) {
                await TaiKhoan.updateOne(
                    { _id: userId },
                    { $set: { 'DiaChi.$[].MacDinh': false } }
                );
            }

            const updatedUser = await TaiKhoan.findByIdAndUpdate(
                userId,
                { $push: { DiaChi: newAddress } },
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!updatedUser) {
                return res.status(404).json({ message: 'Không thể tạo địa chỉ' });
            }

            return res.status(200).json({ 
                message: 'Địa chỉ đã được tạo thành công', 
                data: updatedUser.DiaChi 
            });
        } catch (error) {
            console.error('Lỗi khi tạo địa chỉ: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi tạo địa chỉ', 
                error: error.message 
            });
        }
    }

    async updateAddress(req, res) {
        try {
            const userId = req.user?.id;
            const addressId = req.params.id;

            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            if (!addressId) {
                return res.status(400).json({ message: 'Thiếu ID địa chỉ' });
            }

            const { address } = req.body;
            if (!address) {
                return res.status(400).json({ message: 'Vui lòng cung cấp thông tin địa chỉ' });
            }

            const updateFields = {};
            if (address.HoTen !== undefined) updateFields['DiaChi.$.HoTen'] = address.HoTen.trim();
            if (address.SoDienThoai !== undefined) updateFields['DiaChi.$.SoDienThoai'] = address.SoDienThoai.trim();
            if (address.DiaChiChiTiet !== undefined) updateFields['DiaChi.$.DiaChiChiTiet'] = address.DiaChiChiTiet.trim();
            if (address.PhuongXa !== undefined) updateFields['DiaChi.$.PhuongXa'] = address.PhuongXa.trim();
            if (address.QuanHuyen !== undefined) updateFields['DiaChi.$.QuanHuyen'] = address.QuanHuyen.trim();
            if (address.TinhThanh !== undefined) updateFields['DiaChi.$.TinhThanh'] = address.TinhThanh.trim();
            if (address.MacDinh !== undefined) updateFields['DiaChi.$.MacDinh'] = address.MacDinh;

            // If setting as default, unset others
            if (address.MacDinh === true) {
                await TaiKhoan.updateOne(
                    { _id: userId },
                    { $set: { 'DiaChi.$[elem].MacDinh': false } },
                    { arrayFilters: [{ 'elem._id': { $ne: addressId } }] }
                );
            }

            const updatedUser = await TaiKhoan.findOneAndUpdate(
                { _id: userId, 'DiaChi._id': addressId },
                { $set: updateFields },
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!updatedUser) {
                return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
            }

            return res.status(200).json({ 
                message: 'Địa chỉ đã được cập nhật thành công', 
                data: updatedUser.DiaChi 
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật địa chỉ: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi cập nhật địa chỉ', 
                error: error.message 
            });
        }
    }

    async deleteAddress(req, res) {
        try {
            const userId = req.user?.id;
            const addressId = req.params.id;

            if (!userId) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc token đã hết hạn' });
            }

            if (!addressId) {
                return res.status(400).json({ message: 'Thiếu ID địa chỉ' });
            }

            const updatedUser = await TaiKhoan.findByIdAndUpdate(
                userId,
                { $pull: { DiaChi: { _id: addressId } } },
                { new: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!updatedUser) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản hoặc địa chỉ' });
            }

            return res.status(200).json({ 
                message: 'Địa chỉ đã được xóa thành công', 
                data: updatedUser.DiaChi 
            });
        } catch (error) {
            console.error('Lỗi khi xóa địa chỉ: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi xóa địa chỉ', 
                error: error.message 
            });
        }
    }

    // ============================================
    // CUSTOMER MANAGEMENT (Admin only)
    // ============================================

    /**
     * Cập nhật thông tin khách hàng (Customer)
     */
    async updateCustomer(req, res) {
        try {
            const customerId = req.params.id;
            if (!customerId) {
                return res.status(400).json({ message: 'Thiếu ID khách hàng' });
            }

            const {
                hoten,
                tenDangNhap,
                email,
                sdt,
                gioiTinh,
                ngaySinh,
                // Support old field names
                fullName,
                username,
                phone,
                birthday,
                gender
            } = req.body || {};

            const update = {};

            // Map to schema fields
            if (hoten !== undefined) update.HoTen = String(hoten).trim();
            if (fullName !== undefined) update.HoTen = String(fullName).trim();
            
            if (tenDangNhap !== undefined) update.TenDangNhap = String(tenDangNhap).trim();
            if (username !== undefined) update.TenDangNhap = String(username).trim();
            
            if (email !== undefined) update.Email = String(email).toLowerCase().trim();
            
            if (sdt !== undefined) update.SoDienThoai = String(sdt).trim();
            if (phone !== undefined) update.SoDienThoai = String(phone).trim();
            
            if (gioiTinh !== undefined) update.GioiTinh = gioiTinh || null;
            if (gender !== undefined) update.GioiTinh = gender || null;
            
            if (ngaySinh !== undefined) update.NgaySinh = ngaySinh ? new Date(ngaySinh) : null;
            if (birthday !== undefined) update.NgaySinh = birthday ? new Date(birthday) : null;

            if (Object.keys(update).length === 0) {
                return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
            }

            // Check for duplicate username or email
            if (update.TenDangNhap || update.Email) {
                const existingUser = await TaiKhoan.findOne({
                    _id: { $ne: customerId },
                    $or: [
                        update.TenDangNhap ? { TenDangNhap: update.TenDangNhap } : {},
                        update.Email ? { Email: update.Email } : {}
                    ]
                });

                if (existingUser) {
                    return res.status(400).json({ 
                        message: existingUser.TenDangNhap === update.TenDangNhap 
                            ? 'Tên đăng nhập đã tồn tại' 
                            : 'Email đã được sử dụng' 
                    });
                }
            }

            const customer = await TaiKhoan.findByIdAndUpdate(
                customerId,
                { $set: update },
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!customer) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
            }

            return res.status(200).json({ 
                success: true, 
                message: 'Thông tin khách hàng đã được cập nhật', 
                data: customer 
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật khách hàng: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi cập nhật khách hàng', 
                error: error.message 
            });
        }
    }

    /**
     * Xóa khách hàng (Customer)
     */
    async deleteCustomer(req, res) {
        try {
            const customerId = req.params.id;
            if (!customerId) {
                return res.status(400).json({ message: 'Thiếu ID khách hàng' });
            }

            const customer = await TaiKhoan.findByIdAndDelete(customerId)
                .select('-MatKhau')
                .lean();
            
            if (!customer) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
            }

            return res.status(200).json({ 
                message: 'Khách hàng đã được xóa thành công', 
                data: customer 
            });
        } catch (error) {
            console.error('Lỗi khi xóa khách hàng: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi xóa khách hàng', 
                error: error.message 
            });
        }
    }

    /**
     * Khóa/Mở khóa tài khoản khách hàng
     */
    async lockCustomer(req, res) {
        try {
            const customerId = req.params.id;
            const { lock } = req.body; // lock: true = khóa, false = mở khóa

            if (!customerId) {
                return res.status(400).json({ message: 'Thiếu ID khách hàng' });
            }

            if (typeof lock !== 'boolean') {
                return res.status(400).json({ message: 'Thiếu hoặc giá trị lock không hợp lệ (phải là true/false)' });
            }

            // Schema chỉ chấp nhận 'active' hoặc 'inactive'
            const newStatus = lock ? 'inactive' : 'active';

            const customer = await TaiKhoan.findByIdAndUpdate(
                customerId,
                { $set: { TrangThai: newStatus } },
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!customer) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
            }

            return res.status(200).json({ 
                success: true,
                message: lock ? 'Đã khóa tài khoản khách hàng' : 'Đã mở khóa tài khoản khách hàng',
                data: customer 
            });
        } catch (error) {
            console.error('Lỗi khi khóa/mở khóa khách hàng: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi khóa/mở khóa khách hàng', 
                error: error.message 
            });
        }
    }

    /**
     * Đổi role của khách hàng
     */
    async changeCustomerRole(req, res) {
        try {
            const customerId = req.params.id;
            const { maVaiTro, roleId } = req.body; // Support both field names

            if (!customerId) {
                return res.status(400).json({ message: 'Thiếu ID khách hàng' });
            }

            const roleIdToSet = maVaiTro || roleId;
            if (!roleIdToSet) {
                return res.status(400).json({ message: 'Thiếu ID role (maVaiTro hoặc roleId)' });
            }

            // Verify role exists
            const role = await Role.findById(roleIdToSet);
            if (!role) {
                return res.status(404).json({ message: 'Không tìm thấy role' });
            }

            const customer = await TaiKhoan.findByIdAndUpdate(
                customerId,
                { $set: { MaVaiTro: roleIdToSet } },
                { new: true, runValidators: true }
            )
                .select('-MatKhau')
                .populate('MaVaiTro', 'TenVaiTro MoTa')
                .lean();

            if (!customer) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
            }

            return res.status(200).json({ 
                success: true,
                message: `Đã đổi role thành ${role.TenVaiTro}`,
                data: customer 
            });
        } catch (error) {
            console.error('Lỗi khi đổi role khách hàng: ', error);
            return res.status(500).json({ 
                message: 'Lỗi khi đổi role khách hàng', 
                error: error.message 
            });
        }
    }
    
}

module.exports = new TaiKhoanController();
