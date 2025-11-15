# Backend API Server

Backend API server cho ứng dụng E-commerce sử dụng Node.js, Express, và MongoDB.

## 🚀 Tính năng

- **Authentication & Authorization**: JWT, OAuth (Google, Facebook)
- **Product Management**: CRUD sản phẩm, danh mục
- **Order Management**: Quản lý đơn hàng, thanh toán VNPay
- **Shopping Cart**: Giỏ hàng với sync database
- **Chat System**: Real-time chat giữa customer và admin (Socket.IO)
- **Admin Dashboard**: Quản lý tài khoản, sản phẩm, đơn hàng, khách hàng
- **Supply Chain**: Quản lý chuỗi cung ứng
- **Reviews & Ratings**: Đánh giá sản phẩm

## 📋 Yêu cầu

- Node.js >= 18.x
- MongoDB >= 6.0
- npm hoặc yarn

## 🔧 Cài đặt

1. Clone repository:
```bash
git clone https://github.com/dangvu2405/backend.git
cd backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env`:
```bash
cp .env.example .env
```

4. Cấu hình biến môi trường trong `.env`:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/your-database
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
# ... các biến khác
```

5. Chạy server:
```bash
# Development
npm run dev

# Production
npm start
```

## 📁 Cấu trúc thư mục

```
backend/
├── src/
│   ├── app/
│   │   ├── controllers/    # Controllers xử lý logic
│   │   ├── models/         # Mongoose models
│   │   ├── middlewares/     # Custom middlewares
│   │   └── routes/          # API routes
│   ├── config/              # Cấu hình (database, passport, etc.)
│   ├── constants/           # Constants
│   ├── utils/               # Utility functions
│   ├── socket/              # Socket.IO handlers
│   └── server.js            # Entry point
├── uploads/                 # Uploaded files
├── tests/                   # Test files
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - Đăng nhập
- `POST /auth/register` - Đăng ký
- `POST /auth/refresh-token` - Refresh token
- `POST /auth/logout` - Đăng xuất

### Products
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `POST /admin/products` - Tạo sản phẩm (admin)
- `PUT /admin/products/:id` - Cập nhật sản phẩm (admin)
- `DELETE /admin/products/:id` - Xóa sản phẩm (admin)

### Orders
- `GET /user/orderUser` - Lấy đơn hàng của user
- `POST /user/order` - Tạo đơn hàng
- `GET /admin/orders` - Lấy tất cả đơn hàng (admin)
- `PUT /admin/orders/:id` - Cập nhật đơn hàng (admin)

### Chat
- `GET /chat/room` - Lấy hoặc tạo chat room
- `GET /chat/rooms` - Lấy tất cả chat rooms (admin)
- `GET /chat/room/:id/messages` - Lấy tin nhắn
- `POST /chat/room/:id/read` - Đánh dấu đã đọc

## 🧪 Testing

```bash
npm test
```

## 📝 License

ISC

## 👤 Author

dangvu2405

