// Auth functionality
let currentUser = null;

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
        currentUser = await authAPI.getMe();
        if (document.getElementById('userInfo')) {
            document.getElementById('userInfo').textContent = `Xin chào, ${currentUser.username}`;
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
        if (currentUser) {
            userInfo.textContent = `Xin chào, ${currentUser.username}`;
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
        currentUser = response.user;
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
        currentUser = response.user;
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
    currentUser = null;
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
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        await login(username, password);
    });
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            username: document.getElementById('regUsername').value,
            email: document.getElementById('regEmail').value,
            full_name: document.getElementById('regFullName').value,
            password: document.getElementById('regPassword').value
        };
        await register(userData);
    });
    
    // Show register
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerCard').style.display = 'block';
        document.querySelector('.login-card:not(#registerCard)').style.display = 'none';
    });
    
    // Show login
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerCard').style.display = 'none';
        document.querySelector('.login-card:not(#registerCard)').style.display = 'block';
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Check auth on load
    checkAuth();
});

