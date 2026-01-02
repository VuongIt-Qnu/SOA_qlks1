# 🎨 Frontend - Hệ Thống Quản Lý Khách Sạn

## 📋 Mô Tả

Frontend được xây dựng bằng HTML, CSS và JavaScript thuần, sử dụng Chart.js cho biểu đồ. Giao diện gọi các API từ các microservices.

## 🚀 Chạy Frontend

### Cách 1: Với Docker (Khuyến nghị)

Frontend tự động chạy khi bạn chạy `docker-compose up -d --build`

Truy cập: http://localhost:3000

### Cách 2: Chạy Local (Không dùng Docker)

1. Mở file `index.html` bằng trình duyệt
2. Hoặc sử dụng local server:

```bash
# Với Python
cd frontend
python -m http.server 3000

# Với Node.js (nếu có http-server)
npx http-server -p 3000
```

Truy cập: http://localhost:3000

## 📁 Cấu Trúc

```
frontend/
├── index.html          # Trang chính
├── css/
│   └── style.css      # Stylesheet
├── js/
│   ├── api.js         # API configuration và functions
│   ├── auth.js        # Authentication logic
│   ├── main.js        # Main application logic
│   ├── customers.js   # Customer management
│   ├── rooms.js       # Room management
│   ├── bookings.js    # Booking management
│   ├── payments.js    # Payment management
│   ├── reports.js     # Reports
│   └── dashboard.js   # Dashboard với charts
├── Dockerfile         # Docker configuration
├── nginx.conf         # Nginx configuration
└── README.md          # File này
```

## 🎯 Tính Năng

### 1. Authentication
- Đăng ký tài khoản mới
- Đăng nhập
- Lưu JWT token
- Tự động logout khi token hết hạn

### 2. Dashboard
- Thống kê tổng quan (phòng, đặt phòng, doanh thu, khách hàng)
- Biểu đồ doanh thu theo thời gian (Chart.js Line Chart)
- Biểu đồ trạng thái đặt phòng (Chart.js Doughnut Chart)

### 3. Quản Lý Khách Hàng
- Xem danh sách khách hàng
- Thêm khách hàng mới
- Sửa thông tin khách hàng
- Xóa khách hàng

### 4. Quản Lý Phòng
- Quản lý loại phòng (thêm, xem)
- Quản lý phòng (thêm, xem, sửa)
- Xem trạng thái phòng

### 5. Quản Lý Đặt Phòng
- Xem danh sách đặt phòng
- Tạo đặt phòng mới
- Hủy đặt phòng

### 6. Quản Lý Thanh Toán
- Xem danh sách thanh toán
- Tạo thanh toán mới
- Hoàn tất thanh toán
- Hoàn tiền

### 7. Báo Cáo
- Báo cáo doanh thu (theo khoảng thời gian)
- Thống kê đặt phòng
- Thống kê phòng (tỷ lệ lấp đầy)

## 🔧 Cấu Hình API

Các URL API được cấu hình trong `js/api.js`:

```javascript
const API_CONFIG = {
    AUTH: 'http://localhost:8001',
    CUSTOMER: 'http://localhost:8002',
    ROOM: 'http://localhost:8003',
    BOOKING: 'http://localhost:8004',
    PAYMENT: 'http://localhost:8005',
    REPORT: 'http://localhost:8006'
};
```

**Lưu ý:** Nếu chạy trong Docker, các services giao tiếp qua tên container. Frontend chạy trên browser nên phải dùng `localhost`.

## 🎨 UI/UX Features

- Responsive design (mobile-friendly)
- Modern và clean interface
- Loading states
- Error handling
- Success/Error messages
- Modal dialogs
- Status badges với màu sắc
- Format currency (VND)
- Format dates (Vietnamese format)

## 📦 Dependencies

- **Chart.js**: Biểu đồ (CDN)
- **Font Awesome**: Icons (CDN)

## 🔐 Authentication Flow

1. User đăng nhập/đăng ký
2. Nhận JWT token từ Auth Service
3. Lưu token vào localStorage
4. Gửi token trong header mỗi request: `Authorization: Bearer <token>`
5. Tự động logout nếu token không hợp lệ

## 🐛 Troubleshooting

### CORS Error
Nếu gặp lỗi CORS, cần cấu hình CORS trong các services:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API không kết nối được
- Kiểm tra các services đã chạy chưa
- Kiểm tra URL trong `api.js` có đúng không
- Kiểm tra network tab trong browser DevTools

### Token không hợp lệ
- Đăng nhập lại để lấy token mới
- Kiểm tra token có hết hạn không (mặc định 30 phút)

## 📝 Notes

- Frontend là Single Page Application (SPA)
- Không cần build step, chỉ cần serve static files
- Có thể dễ dàng chuyển sang React/Vue/Angular nếu cần
- Chart.js được load từ CDN

## 🚀 Production Deployment

1. Build Docker image:
```bash
docker build -t hotel-frontend ./frontend
```

2. Hoặc dùng docker-compose:
```bash
docker-compose up -d frontend
```

3. Cấu hình nginx cho production (thêm SSL, domain, etc.)

