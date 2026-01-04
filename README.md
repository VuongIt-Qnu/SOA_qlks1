# 🏨 Hệ Thống Quản Lý Khách Sạn - SOA Architecture

## 📋 Mô Tả Dự Án

Hệ thống quản lý khách sạn được xây dựng theo kiến trúc hướng dịch vụ (SOA - Service-Oriented Architecture) sử dụng FastAPI.

## 🎯 Các Service

1. **Auth Service** - Xác thực và phân quyền người dùng
2. **Customer Service** - Quản lý thông tin khách hàng
3. **Room Service** - Quản lý phòng và loại phòng
4. **Booking Service** - Quản lý đặt phòng
5. **Payment Service** - Xử lý thanh toán
6. **Report Service** - Báo cáo và thống kê

## 🛠️ Công Nghệ Sử Dụng

- **Backend**: FastAPI
- **Database**: MySQL (mỗi service có database riêng)
- **ORM**: SQLAlchemy
- **Container**: Docker + Docker Compose
- **Authentication**: JWT
- **Charts**: Chart.js

## 📁 Cấu Trúc Dự Án

```
SOA_QLKS/
├── services/
│   ├── auth/
│   ├── customer/
│   ├── room/
│   ├── booking/
│   ├── payment/
│   └── report/
├── frontend/              # Giao diện người dùng
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── Dockerfile
├── shared/
│   ├── common/
│   └── utils/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Hướng Dẫn Chạy Dự Án

### Bước 1: Clone và chuẩn bị môi trường
```bash
# Cài đặt Docker và Docker Compose
# Copy file .env.example thành .env và cấu hình
```

### Bước 2: Chạy tất cả services
```bash
docker-compose up -d
```

### Bước 3: Truy cập services
- Auth Service: http://localhost:8001
- Customer Service: http://localhost:8002
- Room Service: http://localhost:8003
- Booking Service: http://localhost:8004
- Payment Service: http://localhost:8005
- Report Service: http://localhost:8006

## 📝 Tài Liệu API

Mỗi service có tài liệu API tự động tại: `http://localhost:{port}/docs`

## 🔐 Authentication

Tất cả các service (trừ Auth) yêu cầu JWT token trong header:
```
Authorization: Bearer <token>
```

## 📚 Tài Liệu Chi Tiết

- **[HUONG_DAN_CHAY_DU_AN.md](./HUONG_DAN_CHAY_DU_AN.md)** - 🚀 **Hướng dẫn chạy dự án chi tiết** (BẮT ĐẦU TỪ ĐÂY!)
- **[QUICK_START.md](./QUICK_START.md)** - ⚡ Hướng dẫn bắt đầu nhanh (5 phút)
- **[HUONG_DAN_DU_AN.md](./HUONG_DAN_DU_AN.md)** - 📖 Hướng dẫn chi tiết từng bước làm dự án
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 🏗️ Kiến trúc hệ thống và sơ đồ
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - 📁 Cấu trúc thư mục và mô tả các thành phần
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - 🗄️ Hướng dẫn setup database cho từng service
- **[SERVICES_SUMMARY.md](./SERVICES_SUMMARY.md)** - 📋 Tóm tắt các services và chức năng
- **[SERVICES_SPECIFICATION.md](./SERVICES_SPECIFICATION.md)** - 📋 **Đặc tả chi tiết các services theo yêu cầu**
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - 🧪 **Hướng dẫn test và kiểm tra database**
- **[API_KEY_GUIDE.md](./API_KEY_GUIDE.md)** - 🔑 **API Key Authentication - Hướng dẫn**
- **[API_KEY_MIGRATION.md](./API_KEY_MIGRATION.md)** - 🔄 **Migration từ JWT sang API Key**
- **[API_GATEWAY.md](./API_GATEWAY.md)** - 🌐 **API Gateway - Single Entry Point**
- **[scripts/README.md](./scripts/README.md)** - 🔍 Scripts kiểm tra services

## 🎯 Tiêu Chí Đánh Giá

Dự án được đánh giá theo 3 phần chính:

1. **Phân tích thiết kế hệ thống (6 điểm)**
   - Phát biểu bài toán và yêu cầu hệ thống
   - Phân chia dịch vụ dựa trên chức năng
   - Phân tích các dịch vụ cụ thể
   - Xây dựng CSDL cho từng dịch vụ

2. **Xây dựng giao diện (3 điểm)**
   - Xây dựng API cho các dịch vụ (FastAPI)
   - Tài liệu mô tả giao diện API (Swagger)
   - Xây dựng giao diện người dùng (Frontend)

3. **Mức độ hoàn thiện (1 điểm)**
   - Hoàn thiện chức năng
   - Giao diện và hình thức
   - Tài liệu và trình bày báo cáo




mk admin là
admin@gmail.com
admin1230