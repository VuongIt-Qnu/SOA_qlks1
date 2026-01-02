# API Routing Documentation

## Tổng quan

Tất cả các request từ frontend đều được điều hướng qua **API Gateway** (port 8000) thay vì gọi trực tiếp các service riêng lẻ.

## Cấu trúc Routing

### API Gateway
- **URL**: `http://localhost:8000`
- **Chức năng**: Single entry point cho tất cả các service

### Service Routing Map

| Frontend Path | API Gateway Path | Backend Service | Service Endpoint |
|--------------|------------------|-----------------|------------------|
| `/auth/*` | `/auth/*` | Auth Service | `/*` (prefix được strip) |
| `/customers/*` | `/customers/*` | Customer Service | `/*` (prefix được strip) |
| `/rooms/*` | `/rooms/*` | Room Service | `/*` (prefix được strip) |
| `/bookings/*` | `/bookings/*` | Booking Service | `/*` (prefix được strip) |
| `/payments/*` | `/payments/*` | Payment Service | `/*` (prefix được strip) |
| `/reports/*` | `/reports/*` | Report Service | `/*` (prefix được strip) |

## Ví dụ Request Flow

### Ví dụ 1: Đăng nhập
```
Frontend Request:
  POST http://localhost:8000/auth/login

API Gateway:
  - Nhận request tại /auth/login
  - Xác định service: Auth Service (prefix /auth)
  - Strip prefix: login
  - Forward đến: http://auth-service:8000/login

Auth Service:
  - Nhận request tại /login
  - Xử lý và trả về response
```

### Ví dụ 2: Lấy danh sách phòng
```
Frontend Request:
  GET http://localhost:8000/rooms/room-types

API Gateway:
  - Nhận request tại /rooms/room-types
  - Xác định service: Room Service (prefix /rooms)
  - Strip prefix: room-types
  - Forward đến: http://room-service:8000/room-types

Room Service:
  - Nhận request tại /room-types
  - Xử lý và trả về response
```

### Ví dụ 3: Tạo booking
```
Frontend Request:
  POST http://localhost:8000/bookings/bookings
  Body: { customer_id: 1, room_id: 1, ... }

API Gateway:
  - Nhận request tại /bookings/bookings
  - Xác định service: Booking Service (prefix /bookings)
  - Strip prefix: bookings
  - Forward đến: http://booking-service:8000/bookings

Booking Service:
  - Nhận request tại /bookings
  - Xử lý và trả về response
```

## Cấu hình Frontend

File `frontend/js/api.js` chứa cấu hình:

```javascript
const API_GATEWAY_URL = 'http://localhost:8000';

const API_CONFIG = {
    GATEWAY: API_GATEWAY_URL,
    AUTH: `${API_GATEWAY_URL}/auth`,
    CUSTOMER: `${API_GATEWAY_URL}/customers`,
    ROOM: `${API_GATEWAY_URL}/rooms`,
    BOOKING: `${API_GATEWAY_URL}/bookings`,
    PAYMENT: `${API_GATEWAY_URL}/payments`,
    REPORT: `${API_GATEWAY_URL}/reports`
};
```

## Authentication

Tất cả các request đều tự động thêm Authorization header nếu có token:

```javascript
const token = getToken();
if (token) {
    headers['Authorization'] = `Bearer ${token}`;
}
```

API Gateway sẽ forward header này đến các backend service.

## Lợi ích của API Gateway

1. **Single Entry Point**: Tất cả request đi qua một điểm duy nhất
2. **Centralized Authentication**: Xử lý authentication tại một nơi
3. **Service Discovery**: Dễ dàng thêm/xóa service
4. **Load Balancing**: Có thể mở rộng để load balance
5. **Rate Limiting**: Có thể thêm rate limiting tại gateway
6. **Logging & Monitoring**: Tập trung logging và monitoring

## Testing

Để test API Gateway:

```bash
# Health check
curl http://localhost:8000/health

# Test auth
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Test với token
curl http://localhost:8000/rooms/room-types \
  -H "Authorization: Bearer YOUR_TOKEN"
```

