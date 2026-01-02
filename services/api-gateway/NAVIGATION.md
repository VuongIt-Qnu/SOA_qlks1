# API Gateway Navigation Documentation

## Tổng quan

API Gateway được cấu hình để xử lý điều hướng và phân quyền:
- **Root endpoint (`/`)**: Kiểm tra authentication và redirect đến trang phù hợp
- **Redirect endpoint (`/redirect`)**: Trả về JSON với URL redirect dựa trên role

## Endpoints

### 1. GET `/` - Root Endpoint

**Mô tả**: Kiểm tra authentication và trả về HTML redirect

**Logic**:
1. Kiểm tra token từ `Authorization` header hoặc query parameter `token`
2. Nếu không có token → Redirect đến `user.html#login`
3. Nếu có token:
   - Verify token
   - Kiểm tra roles:
     - **Admin/Manager/Receptionist** → Redirect đến `admin.html#dashboard`
     - **Customer/User khác** → Redirect đến `user.html#home`

**Ví dụ sử dụng**:
```bash
# Không có token
curl http://localhost:8000/
# → HTML redirect đến user.html#login

# Có token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/
# → HTML redirect đến admin.html hoặc user.html tùy role
```

### 2. GET `/redirect` - Redirect Endpoint

**Mô tả**: Trả về JSON với thông tin redirect

**Response Format**:
```json
{
  "redirect": "admin" | "user" | "login",
  "url": "http://localhost:3000/admin.html#dashboard",
  "roles": ["admin", "manager"],
  "error": "optional error message"
}
```

**Ví dụ sử dụng**:
```bash
# Không có token
curl http://localhost:8000/redirect
# Response:
{
  "redirect": "login",
  "url": "http://localhost:3000/user.html#login"
}

# Có token (Admin)
curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:8000/redirect
# Response:
{
  "redirect": "admin",
  "url": "http://localhost:3000/admin.html#dashboard",
  "roles": ["admin"]
}

# Có token (Customer)
curl -H "Authorization: Bearer CUSTOMER_TOKEN" http://localhost:8000/redirect
# Response:
{
  "redirect": "user",
  "url": "http://localhost:3000/user.html#home",
  "roles": ["customer"]
}
```

## Flow điều hướng

### Flow 1: User truy cập root endpoint

```
User truy cập http://localhost:8000/
    ↓
API Gateway kiểm tra token
    ↓
Không có token?
    └─ YES → HTML redirect đến user.html#login
    ↓
Có token → Verify token
    ↓
Token hợp lệ?
    ├─ NO → HTML redirect đến user.html#login
    │
    └─ YES → Kiểm tra roles
        ├─ Admin/Manager/Receptionist → HTML redirect đến admin.html#dashboard
        └─ Customer/User khác → HTML redirect đến user.html#home
```

### Flow 2: Frontend gọi redirect endpoint

```
Frontend gọi GET /redirect với token
    ↓
API Gateway verify token
    ↓
Trả về JSON với redirect URL
    ↓
Frontend nhận response và redirect
```

## Tích hợp với Frontend

### Cách 1: Sử dụng root endpoint (HTML redirect)

```html
<!-- Trong frontend, có thể redirect trực tiếp -->
<iframe src="http://localhost:8000/" style="display:none;"></iframe>
```

### Cách 2: Sử dụng redirect endpoint (JSON)

```javascript
// Trong frontend JavaScript
async function checkRedirect() {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch('http://localhost:8000/redirect', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.redirect === 'login') {
            window.location.href = data.url;
        } else if (data.redirect === 'admin') {
            window.location.href = data.url;
        } else if (data.redirect === 'user') {
            window.location.href = data.url;
        }
    } catch (error) {
        console.error('Failed to check redirect:', error);
        window.location.href = 'http://localhost:3000/user.html#login';
    }
}
```

## Environment Variables

- `FRONTEND_URL`: URL của frontend (mặc định: `http://localhost:3000`)
- `JWT_SECRET_KEY`: Secret key để verify JWT token

## Security Notes

1. Token được verify bằng `shared.utils.jwt_handler.verify_token`
2. Token có thể được truyền qua:
   - `Authorization: Bearer <token>` header (khuyến nghị)
   - Query parameter `?token=<token>` (ít bảo mật hơn)
3. Token không hợp lệ hoặc hết hạn → redirect về login

## Testing

```bash
# Test root endpoint (không có token)
curl http://localhost:8000/

# Test root endpoint (có token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/

# Test redirect endpoint
curl http://localhost:8000/redirect
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/redirect
```

