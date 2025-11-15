# Backend Use-Case Flow Guide

Tài liệu mô tả luồng hoạt động chính của hệ thống backend `simple-blog-api`. Mục tiêu là giúp team nắm rõ endpoints, middleware, controller và model nào được kích hoạt trong từng tình huống.

---

## 1. Khách (guest) duyệt sản phẩm & lọc tìm kiếm
1. **Frontend** gọi `GET /api/products?page=&limit=&sortBy=` (hoặc `/api/products/:id`).
2. **Router** `src/routes/api.js` → `SanPhamController.getAllProducts/getProduct`.
3. **Middleware**:
   - `auth.middleware` bỏ qua vì đường dẫn khớp với regex public.
   - `responseTime.middleware` ghi nhận thời gian phản hồi.
4. **Controller** `src/app/controllers/SanPhamController.js`:
   - Đọc query, build `sortOptions`.
   - Gọi **Model** `SanPham` (populate `MaLoaiSanPham`).
   - Trả về `{ data, pagination }`.
5. **Frontend** sử dụng dữ liệu để hiển thị, lọc thêm bằng `useDeferredValue` (ProductsPage) và `ProductsGrid`.

> **Lưu ý**: Các request lặp lại 2 lần ở dev do React StrictMode (không phải bug backend).

---

## 2. Quản lý giỏ hàng cho khách & user
### 2.1. Đồng bộ giỏ hàng từ localStorage
1. **Frontend** đọc `storage.getCart()` và gọi `POST /cart/update-cart` với `items`.
2. **Router** `src/routes/cart.js` → `GioHangController.updateCart`.
3. **Middleware**:
   - `auth.middleware` trả về `next()` vì `/cart/...` nằm trong danh sách public.
   - `optionalAuth.middleware` (chỉ với `/cart/checkout`) gắn `req.user` nếu token hợp lệ.
4. **Controller** `GioHangController`:
   - Dùng `resolveCartOwnerId` để xác định `IdKhachHang` (JWT user, `x-guest-id`, query, cookie, …).
   - Nếu chưa có giỏ, tạo mới.
   - Map từng item sang cấu trúc DB (`IdSanPham`, `Gia`, `SoLuong`, `ThanhTien`).
   - Lưu & trả về giỏ hàng (populate sản phẩm).

### 2.2. Lấy giỏ hàng (guest/user)
1. **Frontend** gọi `GET /cart/get-cart` kèm header `x-guest-id` hoặc JWT.
2. **Controller** trả về giỏ nếu tìm thấy, ngược lại gửi cart rỗng `{ Items: [] }`.

### 2.3. Khi đăng xuất
1. **Frontend** nên gọi `POST /cart/update-cart` với cart đang có để lưu server-side trước khi `POST /auth/logout`.
2. `/auth/logout` chỉ xóa session/token; chưa tự động lưu cart.

---

## 3. Checkout & thanh toán
### 3.1. User đã đăng nhập
1. **Frontend** gửi `POST /cart/checkout` (có token).
2. **Middleware**:
   - `auth.middleware`: yêu cầu JWT hợp lệ cho các route `/user/**`, nhưng `/cart/checkout` dùng `optionalAuth`.
   - `optionalAuth.middleware`: gắn `req.user` nếu có token → order gắn đúng `MaKhachHang`.
3. **Controller** `DonHangController.checkout`:
   - Validate `SanPham`, `TongTien`, `PhuongThucThanhToan`.
   - Chuẩn hóa địa chỉ (hỗ trợ object hoặc string).
   - Tạo order (`DonHang` model) với `MaKhachHang = userId`.
   - Nếu COD → trả `requiresPayment: false`. Nếu VNPay → trả `requiresPayment: true`.

### 3.2. Khách vãng lai (guest checkout)
1. **Frontend** gọi `POST /payment/vnpay/create-payment-url` (đã public) hoặc `POST /cart/checkout` với `ThongTinNhanHang`.
2. **Controller** `DonHangController.checkout`/`guestCheckout`:
   - Normalize thông tin nhận hàng qua `normalizeGuestInfo`.
   - Nếu không có `req.user`, generate guest code (`guest-${timestamp}`).
   - Lưu `ThongTinNhanHang` vào order.

### 3.3. Thanh toán VNPay
1. `POST /payment/vnpay/create-payment-url` → `VNPayController.createPaymentUrl`.
2. Sau khi thanh toán, VNPay gọi `GET /payment/vnpay/return` (redirect người dùng) và `GET /payment/vnpay/ipn` (server-to-server).
3. Order cập nhật trạng thái trong `VNPayController` dựa trên response code.

---

## 4. Đăng ký / Đăng nhập / Đăng xuất
1. **Đăng ký** `POST /auth/register`
   - `AuthController.register` tạo user, sinh role Customer, trả access + refresh token.
2. **Đăng nhập** `POST /auth/login`
   - Validate credentials → JWT + refresh token (lưu vào `Session` model).
3. **Đăng xuất** `POST /auth/logout`
   - Xóa session theo refresh token, clear cookie.
   - Frontend tự xóa `localStorage` (tokens, user, cart).
4. **Refresh token** `POST /auth/refresh-token`
   - Kiểm tra session, phát hành access token mới.

---

## 5. Đánh giá sản phẩm
1. **Fetch** `GET /api/reviews/product/:id` hoặc `/stats`
   - Public (được whitelist trong `auth.middleware`).
2. **Tạo đánh giá** (yêu cầu đăng nhập)
   - `POST /api/reviews/product/:id`
   - `auth.middleware` đảm bảo JWT; `DanhGiaController` ghi vào model `DanhGia`.

---

## 6. Tra cứu chuỗi cung ứng / truy xuất nguồn gốc
1. **Frontend** gọi `GET /api/supply-chain/products/:id/trace`.
2. `SupplyChainController.getProductTrace` (hoặc services blockchain) trả dữ liệu on-chain/off-chain.
3. Route đã public nên khách truy cập được toàn bộ hành trình sản phẩm.

---

## 7. Admin portal
1. Đăng nhập (role Admin).
2. Các trang `/admin/**` gọi API tương ứng:
   - Sản phẩm: `SanPhamController` (CRUD).
   - Đơn hàng: `DonHangController.getAllOrders`, `updateDonHang`.
   - Tài khoản: `TaiKhoanController`.
3. `role.middleware` kiểm tra `req.user.MaVaiTro` để chặn user thường.

---

## Lưu ý chung
- **Logging**: Mọi request đi qua `responseTime.middleware` + `morgan`, log màu và cảnh báo chậm (>1s).
- **Guest cart**: cần chuyền `x-guest-id` hoặc query `guestId` để đồng bộ giỏ cho khách.
- **Optional vs Required Auth**:
  - `auth.middleware`: mặc định bảo vệ mọi route (trừ whitelist).
  - `optionalAuth.middleware`: dùng cho endpoint cần biết user nếu có nhưng vẫn phục vụ guest (cart/checkout, VNPay create URL).
- **StrictMode**: React dev mode gọi `useEffect` hai lần → backend nhận nhiều request cho cùng một hành động khi phát triển.

---

Nếu cần bổ sung use-case khác (ví dụ: “quên mật khẩu” chi tiết, chat realtime, hay seed dữ liệu), hãy tạo thêm mục tương tự và mô tả route + controller liên quan.

