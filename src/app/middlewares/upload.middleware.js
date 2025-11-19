const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinaryService = require('../../services/cloudinary.service');

// Đảm bảo thư mục uploads tồn tại (fallback nếu không dùng Cloudinary)
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Chọn storage dựa trên Cloudinary config
// Nếu Cloudinary được cấu hình, dùng memory storage (tốt hơn cho upload lên Cloudinary)
// Nếu không, dùng disk storage (lưu local)
const isCloudinaryEnabled = cloudinaryService.isCloudinaryConfigured();

const storage = isCloudinaryEnabled
  ? multer.memoryStorage() // Memory storage cho Cloudinary
  : multer.diskStorage({   // Disk storage cho local
      destination: function (req, file, cb) {
        cb(null, uploadsDir);
      },
      filename: function (req, file, cb) {
        // Tạo tên file unique: timestamp + random + extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
      }
    });

// Filter chỉ chấp nhận file ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

module.exports = upload;

