// Auth functionality
// Note: currentUser is declared in user.js to avoid duplicate declaration
// We use window.currentUser as a global variable
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}

// Check if user is logged in
function checkAuth() {
    const token = getToken();
    if (token) {
        loadUserInfo();
        showAuthenticatedUI();
    } else {
        showLoginUI();
    }
}

// Load user info
async function loadUserInfo() {
    try {
        window.currentUser = await authAPI.getMe();
        if (document.getElementById('userInfo')) {
            document.getElementById('userInfo').textContent = `Xin chào, ${window.currentUser.username}`;
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
        logout();
    }
}

// Show authenticated UI
function showAuthenticatedUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const loginPage = document.getElementById('loginPage');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (userInfo) {
        userInfo.style.display = 'inline';
        if (window.currentUser) {
            userInfo.textContent = `Xin chào, ${window.currentUser.username}`;
        }
    }
    
    // Hide login page, show dashboard (only if loginPage exists)
    if (loginPage) {
        loginPage.classList.remove('active');
        showPage('dashboard');
    }
}

// Show login UI
function showLoginUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const loginPage = document.getElementById('loginPage');
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'none';
    
    // Show login page (only if loginPage exists)
    if (loginPage) {
        loginPage.classList.add('active');
        document.querySelectorAll('.page').forEach(page => {
            if (page.id !== 'loginPage') {
                page.classList.remove('active');
            }
        });
    }
}

// Login
async function login(username, password) {
    try {
        showLoading();
        const response = await authAPI.login(username, password);
        setToken(response.access_token);
        window.currentUser = response.user;
        showToast('Đăng nhập thành công', 'success');
        
        // Check user roles and redirect using router
        const userRoles = response.user?.roles?.map(r => r.name) || getUserRoles();
        
        // Sử dụng router để điều hướng
        if (typeof router !== 'undefined' && router.onLoginSuccess) {
            router.onLoginSuccess(userRoles);
        } else {
            // Fallback nếu router chưa load
            if (userRoles.includes('admin') || userRoles.includes('manager') || userRoles.includes('receptionist')) {
                window.location.href = 'admin.html#dashboard';
            } else {
                window.location.href = 'user.html#home';
            }
        }
        
        return true;
    } catch (error) {
        showError('loginError', error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        showToast(error.message || 'Đăng nhập thất bại', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

// Register
async function register(userData) {
    // Validation
    if (!validateEmail(userData.email)) {
        showError('registerError', 'Email không hợp lệ');
        showToast('Email không hợp lệ', 'error');
        return false;
    }
    
    if (userData.password.length < 6) {
        showError('registerError', 'Mật khẩu phải có ít nhất 6 ký tự');
        showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        return false;
    }
    
    // Set default role to customer if not specified
    if (!userData.role_name) {
        userData.role_name = 'customer';
    }
    
    try {
        showLoading();
        const response = await authAPI.register(userData);
        setToken(response.access_token);
        window.currentUser = response.user;
        showToast('Đăng ký thành công', 'success');
        
        // Check user roles and redirect using router
        const userRoles = response.user?.roles?.map(r => r.name) || getUserRoles();
        
        // Sử dụng router để điều hướng
        if (typeof router !== 'undefined' && router.onRegisterSuccess) {
            router.onRegisterSuccess(userRoles);
        } else {
            // Fallback nếu router chưa load
            if (userRoles.includes('admin') || userRoles.includes('manager') || userRoles.includes('receptionist')) {
                window.location.href = 'admin.html#dashboard';
            } else {
                window.location.href = 'user.html#home';
            }
        }
        
        return true;
    } catch (error) {
        showError('registerError', error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        showToast(error.message || 'Đăng ký thất bại', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

// Logout
function logout() {
    removeToken();
    window.currentUser = null;
    showToast('Đã đăng xuất', 'info');
    
    // Sử dụng router để logout
    if (typeof router !== 'undefined' && router.logout) {
        router.logout();
    } else {
        // Fallback
        showLoginUI();
    }
}

// Show error message
function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 5000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form (for index.html)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            await login(username, password);
        });
    }
    
    // Register form (for index.html)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                username: document.getElementById('regUsername').value,
                email: document.getElementById('regEmail').value,
                full_name: document.getElementById('regFullName').value,
                password: document.getElementById('regPassword').value
            };
            await register(userData);
        });
    }
    
    // Show register (for index.html)
    const showRegister = document.getElementById('showRegister');
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerCard').style.display = 'block';
            document.querySelector('.login-card:not(#registerCard)').style.display = 'none';
        });
    }
    
    // Show login (for index.html)
    const showLogin = document.getElementById('showLogin');
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerCard').style.display = 'none';
            document.querySelector('.login-card:not(#registerCard)').style.display = 'block';
        });
    }
    
    // Logout button (for index.html)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Check auth on load (only for index.html)
    // user.html has its own checkUserAuth in user.js
    if (document.body.classList.contains('user-layout') || document.body.classList.contains('admin-layout')) {
        // Skip checkAuth for user.html and admin.html - they have their own auth checks
        return;
    }
    checkAuth();
});

