# Đồ Cũ Còn Thương - Sàn Thương Mại Điện Tử Đồ Second-Hand (Demo 1-1)

Website thương mại điện tử chuyên đồ cũ chất lượng cao, minh bạch % độ mới, theo dõi hành trình đơn hàng chi tiết từng chặng với mô hình tương tác 1 người bán (Seller) và 1 người mua (Buyer).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

Chỉ với 1-2 lệnh đơn giản trong terminal:

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi động server full-stack (gồm cả Backend Express API & Frontend React Vite)
npm run dev
```

Truy cập ứng dụng tại: **http://localhost:3000** (hoặc URL của môi trường đang chạy).

Dữ liệu SQLite được tự động khởi tạo và seed sẵn tại thư mục `data/store.sqlite` ngay khi server khởi động lần đầu.

---

## 🌐 Hướng Dẫn Deploy Lên Vercel / Render / Cloud

### 1. Deploy lên Vercel
Dự án đã được cấu hình sẵn file `vercel.json` và serverless API `api/index.ts`:
- Kết nối kho code GitHub với Vercel.
- Framework Preset: **Vite** (mặc định).
- Vercel sẽ tự động build frontend `dist` và kích hoạt Serverless API tại `/api`.
- *Lưu ý về Vercel:* Vì Vercel là môi trường Serverless (bộ nhớ tạm `/tmp`), nếu web không có lượt truy cập sau một thời gian, dữ liệu SQLite trong `/tmp` có thể tự động reset về dữ liệu ban đầu.

### 2. Deploy lên Render / Railway (Khuyên dùng cho Database lâu dài)
- Tạo dịch vụ mới: chọn **Web Service**.
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Server Node.js Express sẽ chạy liên tục 24/7 và lưu dữ liệu SQLite vĩnh viễn.

---

## 👥 Tài Khoản Thử Nghiệm Có Sẵn (Seeded Accounts)

### 1. Người bán (Seller)
- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `admin`
- **Họ tên hiển thị:** Chủ Tiệm Còn Thương
- **Quyền hạn:** Truy cập Dashboard quản trị, thêm/sửa/xóa sản phẩm trong kho, duyệt đơn hàng, chọn đơn vị vận chuyển, gửi báo cáo hành trình giao hàng từng chặng, hủy đơn và hoàn trả tồn kho.

### 2. Khách mua (Buyer)
- **Tên đăng nhập / Số điện thoại:** `0987654321`
- **Mật khẩu:** `nguoidung`
- **Họ tên hiển thị:** Nguyễn Văn A
- **Địa chỉ giao hàng có sẵn:** 128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
- **Giỏ hàng ban đầu:** Trống, 0 đơn hàng ban đầu.

> **Mẹo:** Trên thanh điều hướng (Header) có sẵn nút chuyển nhanh tài khoản **"Khách mua"** và **"Người bán"** để bạn chuyển đổi kiểm thử tức thì trong 1 click.

---

## 💳 Thông Tin Thẻ Test & Giả Lập Thanh Toán

Ứng dụng hỗ trợ mô phỏng thanh toán thẻ an toàn (không kết nối cổng thanh toán thật, không lưu số thẻ đầy đủ và CVV vào database):

- **Thẻ Visa thành công:** `4111 1111 1111 1111` | Hạn: `12/28` | CVV: `123`
- **Thẻ bị từ chối:** `4000 0000 0000 0002` | Hạn: `10/28` | CVV: `999`
- **Thẻ ATM nội địa NAPAS:** `9704 1234 5678 9012` | Vietcombank | Hạn: `06/25`
- **Mã OTP Demo:** `123456`

---

## 📦 Danh Sách 10 Món Đồ Cũ Được Seed Sẵn

1. **Áo khoác denim cũ size L** – Thời trang – 350.000đ (gốc 1.200.000đ) – Độ mới 95% – Không rách, phai màu nhẹ tự nhiên – Kho: 1
2. **Máy ảnh film Canon AE-1** – Máy ảnh – 3.200.000đ (gốc 6.000.000đ) – Độ mới 85% – Chạy tốt, trầy nhẹ thân máy – Kho: 1
3. **iPhone 11 64GB** – Điện tử – 4.500.000đ (gốc 8.000.000đ) – Độ mới 90% – Pin 84%, máy zin, có vài vết xước nhẹ – Kho: 2
4. **Sách "Nhà giả kim" bản cũ** – Sách – 45.000đ (gốc 79.000đ) – Độ mới 80% – Ố vàng nhẹ, không mất trang – Kho: 5
5. **Tai nghe Sony WH-1000XM3** – Điện tử – 2.100.000đ (gốc 5.500.000đ) – Độ mới 88% – Chống ồn tốt, đệm tai đã thay mới – Kho: 1
6. **Đàn guitar acoustic Yamaha F310** – Nhạc cụ – 1.500.000đ (gốc 2.900.000đ) – Độ mới 85% – Âm chuẩn, kèm bao đàn – Kho: 1
7. **Bàn phím cơ Keychron K2** – Điện tử – 1.100.000đ (gốc 2.000.000đ) – Độ mới 92% – Đủ phím, kèm dây sạc – Kho: 2
8. **Đồng hồ Casio A168 vintage** – Phụ kiện – 450.000đ (gốc 900.000đ) – Độ mới 90% – Đã thay pin, dây còn đẹp – Kho: 3
9. **Nồi chiên không dầu Philips 4.1L** – Gia dụng – 900.000đ (gốc 2.300.000đ) – Độ mới 85% – Lòng nồi còn chống dính tốt – Kho: 1
10. **Túi xách da thật vintage** – Thời trang – 600.000đ (gốc 1.800.000đ) – Độ mới 80% – Da mềm, có dấu sờn ở quai – Kho: 1

**Chính sách phí vận chuyển:** Cố định 30.000đ (Miễn phí vận chuyển toàn quốc cho đơn hàng từ 1.000.000đ).

---

## 🔄 Luồng Trạng Thái Đơn Hàng & Vận Chuyển

```
[Chờ xác nhận] ─── (Duyệt đơn) ───> [Chờ lấy hàng] ─── (Bàn giao) ───> [Đang giao] ─── (Giao thành công) ───> [Đã giao] ─── (Xác nhận) ───> [Hoàn thành]
      │                                    │
      └─── (Hủy đơn + Hoàn kho) ───────────┘
                       │
                       ▼
                   [Đã hủy]
```

- **Hủy đơn:**
  - Khách hàng được hủy đơn khi còn ở trạng thái `Chờ xác nhận`.
  - Người bán được hủy đơn khi ở trạng thái `Chờ xác nhận` hoặc `Chờ lấy hàng`.
  - Khi đơn bị hủy: Tồn kho sản phẩm được hoàn lại ngay lập tức; nếu đơn đã thanh toán qua thẻ, trạng thái thanh toán tự chuyển thành `Đã hoàn tiền (mô phỏng)`.
- **Cập nhật COD:** Với đơn COD, khi người bán báo cáo sự kiện `Giao hàng thành công`, trạng thái thanh toán tự động chuyển thành `Đã thanh toán`.
- **Thời gian thực:** Giao diện khách hàng tự động polling mỗi 10 giây để nhận các cập nhật mới nhất từ người bán mà không cần đăng nhập lại.

---

## 🧪 Kịch Bản Kiểm Thử Đề Xuất (End-to-End)

1. **Bước 1 (Khách mua):** Đăng nhập với `0987654321` / `nguoidung` → Thêm 2 sản phẩm vào giỏ → Mở giỏ hàng, bấm "Tiến hành đặt hàng" → Chọn thẻ Visa Test (`4111 1111 1111 1111`) → Nhập mã OTP `123456` → Đặt hàng thành công nhận mã đơn (vd: `DCT20261022001`).
2. **Bước 2 (Đặt thêm đơn COD):** Đặt thêm 1 đơn hàng với phương thức `Thanh toán khi nhận hàng (COD)`.
3. **Bước 3 (Người bán):** Đăng nhập tài khoản `admin` / `admin` → Vào "Quản trị cửa hàng" → Thấy 2 đơn mới:
   - Duyệt đơn 1 (chuyển sang `Chờ lấy hàng`).
   - Hủy đơn 2 với lý do (tồn kho sản phẩm được hoàn lại tức thì).
4. **Bước 4 (Vận chuyển):** Với đơn 1, chọn đơn vị vận chuyển (vd: `Giao Hàng Nhanh`), hệ thống tự sinh mã vận đơn `GHN...VN` → Bấm "Gửi báo cáo tình trạng giao hàng" thêm các mốc (Đã bàn giao, Đang giao hàng, Giao hàng thành công).
5. **Bước 5 (Khách kiểm tra):** Đăng nhập lại tài khoản khách → Vào "Đơn mua của tôi" → Thấy đơn 1 có đầy đủ timeline di chuyển chi tiết, đơn 2 nằm trong tab "Đã hủy" kèm lý do hủy → Bấm "Đã nhận được hàng" cho đơn 1 để hoàn tất.

---

## 📁 Cấu Trúc Mã Nguồn

```
├── server.ts               # Máy chủ Express tích hợp Vite dev middleware trên port 3000
├── server/
│   ├── db.ts               # SQLite engine (sql.js) & DDL schema
│   ├── seed.ts             # Khởi tạo dữ liệu mẫu người bán, khách hàng, 10 sản phẩm
│   ├── auth.ts             # JWT authentication & role-based middleware
│   └── routes/
│       ├── auth.ts         # /api/auth (login, register, me)
│       ├── products.ts     # /api/products (danh mục, tìm kiếm, CRUD)
│       ├── cart.ts         # /api/cart (thêm, sửa số lượng, tính phí ship)
│       ├── orders.ts       # /api/orders (đặt hàng, hủy đơn, hoàn tất)
│       └── seller.ts       # /api/seller (thống kê KPI, duyệt đơn, vận chuyển)
├── src/
│   ├── App.tsx             # Điều phối giao diện cửa hàng, đơn mua, quản trị
│   ├── types.ts            # Type definitions (User, Product, Order, ShipmentEvent...)
│   ├── context/
│   │   ├── AuthContext.tsx # Quản lý phiên đăng nhập & tài khoản demo
│   │   └── ToastContext.tsx# Hệ thống thông báo toast
│   ├── components/
│   │   ├── Header.tsx      # Top bar contract 3 vùng & bộ chuyển demo
│   │   ├── ProductCard.tsx # Thẻ sản phẩm chuẩn thẩm mỹ vintage, độ mới %
│   │   ├── ProductDetailModal.tsx # Chi tiết tình trạng, mua ngay
│   │   ├── CartDrawer.tsx  # Giỏ hàng slide-over & thanh tiến trình freeship
│   │   ├── CheckoutModal.tsx # Form thanh toán thẻ test, Luhn, OTP demo
│   │   ├── OrdersView.tsx  # Tab đơn mua Shopee, stepper, timeline vận chuyển
│   │   ├── SellerDashboard.tsx # Bảng điều khiển người bán, quản trị kho, xử lý đơn
│   │   ├── AuthModal.tsx   # Đăng nhập/đăng ký riêng biệt
│   │   └── SuccessOrderModal.tsx # Thông báo đặt hàng thành công
│   └── utils/
│       └── format.ts       # Định dạng VNĐ, ngày giờ, thuật toán Luhn
└── data/
    └── store.sqlite        # Tệp cơ sở dữ liệu SQLite lưu trữ thực tế
```
