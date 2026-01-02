# Router Class Documentation

## Tổng quan

**Router Class** (`frontend/js/router.js`) là class chính quản lý điều hướng (routing) cho toàn bộ ứng dụng, đặc biệt là xử lý routing cho **login** và **register**.

## Cấu trúc Class

```javascript
class Router {
    constructor()
    init()
    registerRoutes()
    handleRoute()
    navigate(routeName, pushState)
    showLoginPage()
    showRegisterPage()
    onLoginSuccess(userRoles)
    onRegisterSuccess(userRoles)
    logout()
}
```

## Các Routes được đăng ký

### Public Routes (Không cần authentication)
- **`login`** - `/login` - Trang đăng nhập
- **`register`** - `/register` - Trang đăng ký
- **`home`** - `/home` - Trang chủ (user)

### Protected Routes (Cần authentication)
- **`dashboard`** - `/dashboard` - Dashboard admin
- **`customers`** - `/customers` - Quản lý khách hàng
- **`rooms`** - `/rooms` - Quản lý phòng
- **`bookings`** - `/bookings` - Quản lý đặt phòng
- **`payments`** - `/payments` - Quản lý thanh toán
- **`reports`** - `/reports` - Báo cáo
- **`myBookings`** - `/my-bookings` - Bookings của user

## Cách sử dụng

### 1. Điều hướng đến trang login

```javascript
// Cách 1: Sử dụng router
router.navigate('login');

// Cách 2: Sử dụng URL hash
window.location.href = 'user.html#login';
```

### 2. Điều hướng đến trang register

```javascript
// Cách 1: Sử dụng router
router.navigate('register');

// Cách 2: Sử dụng URL hash
window.location.href = 'user.html#register';
```

### 3. Xử lý sau khi đăng nhập thành công

```javascript
// Trong auth.js, sau khi login thành công:
const userRoles = response.user?.roles?.map(r => r.name) || getUserRoles();
router.onLoginSuccess(userRoles);
```

Router sẽ tự động:
- Kiểm tra role của user
- Redirect admin/manager/receptionist → `admin.html#dashboard`
- Redirect customer → `user.html#home`

### 4. Xử lý sau khi đăng ký thành công

```javascript
// Trong auth.js, sau khi register thành công:
const userRoles = response.user?.roles?.map(r => r.name) || getUserRoles();
router.onRegisterSuccess(userRoles);
```

### 5. Logout

```javascript
router.logout();
// Tự động redirect về trang login
```

## Flow điều hướng Login/Register

### Flow Login:

```
User click "Login"
    ↓
router.navigate('login') hoặc showLoginModal()
    ↓
Hiển thị form login
    ↓
User submit form
    ↓
authAPI.login()
    ↓
Thành công → router.onLoginSuccess(userRoles)
    ↓
Kiểm tra role:
    - Admin/Manager/Receptionist → admin.html#dashboard
    - Customer → user.html#home
```

### Flow Register:

```
User click "Register"
    ↓
router.navigate('register') hoặc showRegisterModal()
    ↓
Hiển thị form register
    ↓
User submit form
    ↓
authAPI.register()
    ↓
Thành công → router.onRegisterSuccess(userRoles)
    ↓
Kiểm tra role:
    - Admin/Manager/Receptionist → admin.html#dashboard
    - Customer → user.html#home
```

## Tích hợp với các file khác

### 1. `auth.js`
- Sử dụng `router.onLoginSuccess()` sau khi login thành công
- Sử dụng `router.onRegisterSuccess()` sau khi register thành công
- Sử dụng `router.logout()` khi logout

### 2. `user.js`
- Sử dụng `router.navigate()` để chuyển trang
- Modal login/register được quản lý bởi router

### 3. `admin.js`
- Sử dụng `router.navigate()` để chuyển trang admin

### 4. `main.js`
- `showPage()` được gọi bởi router

## Ví dụ sử dụng

### Ví dụ 1: Tạo link đăng nhập

```html
<a href="#" onclick="router.navigate('login'); return false;">
    Đăng nhập
</a>
```

### Ví dụ 2: Redirect sau khi login

```javascript
async function handleLogin(username, password) {
    try {
        const response = await authAPI.login(username, password);
        setToken(response.access_token);
        
        const userRoles = response.user?.roles?.map(r => r.name) || getUserRoles();
        router.onLoginSuccess(userRoles);
    } catch (error) {
        showToast('Đăng nhập thất bại', 'error');
    }
}
```

### Ví dụ 3: Kiểm tra auth trước khi vào trang

```javascript
// Router tự động kiểm tra
router.navigate('dashboard');
// Nếu chưa đăng nhập → tự động redirect về login
```

## Lợi ích

1. **Tập trung**: Tất cả logic routing ở một nơi
2. **Dễ bảo trì**: Dễ thêm/sửa/xóa routes
3. **Bảo mật**: Tự động kiểm tra authentication
4. **URL-friendly**: Sử dụng hash routing
5. **Tự động redirect**: Tự động redirect dựa trên role

## File liên quan

- `frontend/js/router.js` - Router class
- `frontend/js/auth.js` - Authentication logic
- `frontend/js/user.js` - User interface
- `frontend/js/admin.js` - Admin interface
- `frontend/js/main.js` - Main application logic

