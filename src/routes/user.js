const express = require('express');
const router = express.Router();
const TaiKhoanController = require('../app/controllers/TaiKhoanController');
const authMiddleware = require('../app/middlewares/auth.middleware');
const upload = require('../app/middlewares/upload.middleware');
const DonHangController = require('../app/controllers/DonHangController');
// GET /me	lấy thông tin người dùng sau khi login
router.get('/me', TaiKhoanController.getMe);
// POST /uploadAvatar	upload avatar file, xong save vô database
router.post('/uploadAvatar', upload.single('avatar'), TaiKhoanController.uploadAvatar);
// PATCH /m update user's profile
router.put('/me', TaiKhoanController.updateUser);
// // GET /order	tất cả đơn hàng của người dùng
router.get('/orderUser', DonHangController.getDonHang);
// // GET /order/:id	xem chi tiết đơn hàng của người dùng
router.get('/orderUser/:id', DonHangController.getDetailDonHang);
// // DELETE /order/:id	hủy đơn hàng 
router.delete('/orderUser/:id', DonHangController.cancelDonHang);
// // POST /changepassword	đổi mật khẩu tài khoản
router.post('/changepassword', TaiKhoanController.changePassword);
// GET /addess	lấy địa chỉ người dùng
router.get('/addess', TaiKhoanController.getAddresses);
// POST /addess	thêm địa chỉ 
router.post('/addess', TaiKhoanController.createAddress);
// PATCH /addess/:id	cập nhật địa chỉ người dùng
router.patch('/addess/:id', TaiKhoanController.updateAddress);
// DELETE /addess/:id	xóa địa chỉ của người dùng
router.delete('/addess/:id', TaiKhoanController.deleteAddress);

module.exports = router;