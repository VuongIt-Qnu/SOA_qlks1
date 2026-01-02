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
        document.getElementById('userInfo').textContent = `Xin chào, ${currentUser.username}`;
    } catch (error) {
        console.error('Failed to load user info:', error);
        logout();
    }
}

// Show authenticated UI
function showAuthenticatedUI() {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'inline-flex';
    document.getElementById('userInfo').style.display = 'inline';
    
    // Hide login page, show dashboard
    document.getElementById('loginPage').classList.remove('active');
    showPage('dashboard');
}

// Show login UI
function showLoginUI() {
    document.getElementById('loginBtn').style.display = 'inline-flex';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    
    // Show login page
    document.getElementById('loginPage').classList.add('active');
    document.querySelectorAll('.page').forEach(page => {
        if (page.id !== 'loginPage') {
            page.classList.remove('active');
        }
    });
}

// Login
async function login(username, password) {
    try {
        showLoading();
        const response = await authAPI.login(username, password);
        setToken(response.access_token);
        showToast('Đăng nhập thành công', 'success');
        checkAuth();
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
    
    try {
        showLoading();
        const response = await authAPI.register(userData);
        setToken(response.access_token);
        showToast('Đăng ký thành công', 'success');
        checkAuth();
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
    showLoginUI();
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

