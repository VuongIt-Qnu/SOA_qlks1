# Navigation Flow Documentation

## Tổng quan

Hệ thống điều hướng được thiết kế với logic rõ ràng:
- **Bắt đầu**: Luôn bắt đầu từ trang login/register (user.html)
- **Sau khi đăng nhập**: Redirect dựa trên role
  - **Admin/Manager/Receptionist** → `admin.html#dashboard`
  - **Customer/User khác** → `user.html#home`

## Flow điều hướng chi tiết

### 1. Flow khi truy cập ứng dụng lần đầu

```
User truy cập bất kỳ URL nào
    ↓
Router kiểm tra authentication
    ↓
Chưa đăng nhập?
    ↓ YES
Redirect về user.html#login
    ↓
Hiển thị form login/register
```

### 2. Flow đăng nhập (Login)

```
User ở user.html#login
    ↓
User nhập username/password
    ↓
Submit form → authAPI.login()
    ↓
Thành công → router.onLoginSuccess(userRoles)
    ↓
Kiểm tra role:
    ├─ Admin/Manager/Receptionist?
    │   └─ YES → Redirect đến admin.html#dashboard
    │
    └─ Customer/User khác?
        └─ YES → Ở lại user.html#home
```

### 3. Flow đăng ký (Register)

```
User ở user.html#register
    ↓
User điền form đăng ký
    ↓
Submit form → authAPI.register()
    ↓
Thành công → router.onRegisterSuccess(userRoles)
    ↓
Kiểm tra role:
    ├─ Admin/Manager/Receptionist?
    │   └─ YES → Redirect đến admin.html#dashboard
    │
    └─ Customer/User khác?
        └─ YES → Ở lại user.html#home
```

### 4. Flow khi truy cập admin.html

```
User truy cập admin.html
    ↓
checkAdminAccess() được gọi
    ↓
Kiểm tra token?
    ├─ Không có token?
    │   └─ Redirect về user.html#login
    │
    └─ Có token?
        ↓
        Kiểm tra role?
            ├─ Admin/Manager/Receptionist?
            │   └─ YES → Cho phép truy cập, load dashboard
            │
            └─ Customer/User khác?
                └─ Redirect về user.html#home
```

### 5. Flow khi truy cập user.html

```
User truy cập user.html
    ↓
Router kiểm tra authentication
    ↓
Chưa đăng nhập?
    ├─ YES → Hiển thị login modal hoặc redirect #login
    │
    └─ NO → Hiển thị trang home hoặc trang được yêu cầu
```

## Các trường hợp đặc biệt

### Trường hợp 1: User đã đăng nhập cố vào login/register

```
User đã đăng nhập → Cố vào #login hoặc #register
    ↓
Router phát hiện đã đăng nhập
    ↓
router.redirectAfterLogin()
    ↓
Kiểm tra role:
    ├─ Admin → admin.html#dashboard
    └─ User → user.html#home
```

### Trường hợp 2: User chưa đăng nhập cố vào protected route

```
User chưa đăng nhập → Cố vào #dashboard, #customers, etc.
    ↓
Router phát hiện chưa đăng nhập
    ↓
router.redirectToLogin()
    ↓
Redirect về user.html#login
```

### Trường hợp 3: Admin cố vào user.html

```
Admin đã đăng nhập → Truy cập user.html
    ↓
Router kiểm tra role
    ↓
Phát hiện là admin
    ↓
Có thể:
    - Cho phép xem (nếu cần)
    - Hoặc redirect về admin.html#dashboard
```

## Code Implementation

### Router Class Methods

```javascript
// Xử lý sau khi login thành công
onLoginSuccess(userRoles) {
    const isAdmin = userRoles.includes('admin') || 
                   userRoles.includes('manager') || 
                   userRoles.includes('receptionist');
    
    if (isAdmin) {
        window.location.href = 'admin.html#dashboard';
    } else {
        window.location.href = 'user.html#home';
    }
}

// Xử lý sau khi register thành công
onRegisterSuccess(userRoles) {
    this.onLoginSuccess(userRoles);
}

// Điều hướng mặc định
navigateToDefault() {
    if (!this.isAuthenticated()) {
        // Chưa đăng nhập → luôn về login
        window.location.href = 'user.html#login';
        return;
    }
    
    // Đã đăng nhập → kiểm tra role
    const roles = getUserRoles();
    const isAdmin = roles.includes('admin') || 
                   roles.includes('manager') || 
                   roles.includes('receptionist');
    
    if (isAdmin) {
        window.location.href = 'admin.html#dashboard';
    } else {
        window.location.href = 'user.html#home';
    }
}
```

## Tóm tắt Rules

1. **Luôn bắt đầu từ login/register** (user.html)
2. **Admin/Manager/Receptionist** → `admin.html#dashboard`
3. **Customer/User khác** → `user.html#home`
4. **Chưa đăng nhập** → Luôn redirect về `user.html#login`
5. **Đã đăng nhập cố vào login/register** → Redirect về trang tương ứng với role

## Files liên quan

- `frontend/js/router.js` - Router class chính
- `frontend/js/auth.js` - Authentication logic
- `frontend/js/user.js` - User interface logic
- `frontend/js/admin.js` - Admin interface logic
- `frontend/user.html` - Trang user (login/register)
- `frontend/admin.html` - Trang admin

