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
        console.log('[loadUserInfo] Calling authAPI.getMe()...');
        window.currentUser = await authAPI.getMe();
        console.log('[loadUserInfo] User info loaded:', window.currentUser);
        if (document.getElementById('userInfo')) {
            document.getElementById('userInfo').textContent = `Xin chào, ${window.currentUser.username}`;
        }
    } catch (error) {
        console.error('[loadUserInfo] Failed to load user info:', error);
        console.error('[loadUserInfo] Error status:', error.status);
        console.error('[loadUserInfo] Error message:', error.message);
        
        // Only logout if it's a real authentication error (401/403)
        if (error.status === 401 || error.status === 403) {
            console.warn('[loadUserInfo] Authentication failed, logging out');
            logout();
        } else {
            // For other errors, just log and continue
            console.warn('[loadUserInfo] Non-auth error, not logging out');
        }
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
        console.log('=== LOGIN START ===');
        console.log('Username:', username);
        
        // Show loading if function exists
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        console.log('Calling authAPI.login...');
        const response = await authAPI.login(username, password);
        
        // Debug: Log full response
        console.log('=== LOGIN RESPONSE ===');
        console.log('Full response:', JSON.stringify(response, null, 2));
        console.log('Response type:', typeof response);
        console.log('Has access_token?', !!response?.access_token);
        console.log('Has user?', !!response?.user);
        console.log('Access token:', response?.access_token ? response.access_token.substring(0, 30) + '...' : 'null');
        
        // Check if response is valid
        if (!response || !response.access_token) {
            console.error('ERROR: Invalid response from login API');
            console.error('Response:', response);
            if (typeof showToast === 'function') {
                showToast('Lỗi: Phản hồi từ server không hợp lệ. Vui lòng thử lại.', 'error');
            }
            return false;
        }
        
        // Save token
        console.log('Saving token to localStorage...');
        setToken(response.access_token);
        
        // Verify token was saved
        const savedToken = getToken();
        console.log('Token saved check:', savedToken ? savedToken.substring(0, 30) + '...' : 'null');
        
        if (!savedToken) {
            console.error('ERROR: Token was not saved to localStorage!');
            if (typeof showToast === 'function') {
                showToast('Lỗi: Không thể lưu token. Vui lòng thử lại.', 'error');
            }
            return false;
        }
        
        window.currentUser = response.user || null;
        console.log('Current user set:', window.currentUser);
        
        // Show success message
        showAuthMessage('Đăng nhập thành công', 'success');
        if (typeof showToast === 'function') {
            showToast('Đăng nhập thành công', 'success');
        } else {
            console.warn('showToast function not available');
        }
        
        // Check user roles and redirect using router
        // Extract roles from response - handle both array of objects and array of strings
        let userRoles = [];
        console.log('=== EXTRACTING ROLES ===');
        console.log('response.user:', response.user);
        console.log('response.user?.roles:', response.user?.roles);
        
        if (response.user?.roles && Array.isArray(response.user.roles)) {
            console.log('Extracting roles from response.user.roles');
            userRoles = response.user.roles.map(r => {
                // Handle both {name: "admin"} and "admin" formats
                let roleStr = '';
                if (typeof r === 'string') {
                    roleStr = r;
                } else if (r && typeof r === 'object' && r.name) {
                    roleStr = r.name;
                } else {
                    roleStr = String(r);
                }
                // Normalize to lowercase and trim
                const normalized = roleStr.toLowerCase().trim();
                console.log('Role:', r, '-> normalized:', normalized);
                return normalized;
            });
        } else {
            // Fallback to JWT token roles (already normalized in getUserRoles)
            console.log('No roles in response.user, trying to get from JWT token');
            if (typeof getUserRoles === 'function') {
                userRoles = getUserRoles();
                console.log('Roles from JWT:', userRoles);
            } else {
                console.error('getUserRoles function not available!');
            }
        }
        
        console.log('=== FINAL ROLES ===');
        console.log('User roles after login:', userRoles);
        console.log('User roles type:', typeof userRoles, Array.isArray(userRoles));
        
        // Verify token is saved before redirect
        const tokenCheck = getToken();
        if (!tokenCheck) {
            console.error('ERROR: Token not found after setToken!');
            showToast('Lỗi: Token không được lưu. Vui lòng đăng nhập lại.', 'error');
            return false;
        }
        
        // Check if admin using helper function (consistent check)
        console.log('=== CHECKING ADMIN STATUS ===');
        const isAdmin = typeof checkIsAdmin !== 'undefined' 
            ? checkIsAdmin(userRoles) 
            : (Array.isArray(userRoles) && userRoles.some(role => ['admin', 'manager', 'receptionist'].includes(role.toLowerCase().trim())));
        console.log('Auth.js: Is admin?', isAdmin, 'roles:', userRoles);
        console.log('checkIsAdmin function available?', typeof checkIsAdmin !== 'undefined');
        
        // Retry mechanism to ensure router is ready
        let retryCount = 0;
        const maxRetries = 10; // Tăng số lần retry
        
        const attemptRedirect = () => {
            retryCount++;
            console.log(`=== REDIRECT ATTEMPT ${retryCount}/${maxRetries} ===`);
            console.log('window.router available?', typeof window.router !== 'undefined');
            console.log('window.router.onLoginSuccess available?', typeof window.router !== 'undefined' && typeof window.router.onLoginSuccess === 'function');
            
            // Sử dụng router để điều hướng
            if (typeof window.router !== 'undefined' && typeof window.router.onLoginSuccess === 'function') {
                console.log('✅ Auth.js: Using router.onLoginSuccess');
                try {
                    window.router.onLoginSuccess(userRoles);
                    console.log('✅ Router.onLoginSuccess called successfully');
                } catch (error) {
                    console.error('❌ Error calling router.onLoginSuccess:', error);
                    // Fallback to direct redirect
                    if (isAdmin) {
                        console.log('Auth.js: Fallback - Admin → redirect đến admin/admin.html#dashboard');
                        window.location.href = '/admin/admin.html#dashboard';
                    } else {
                        console.log('Auth.js: Fallback - User → redirect đến user/user.html#home');
                        window.location.href = '/user/user.html#home';
                    }
                }
            } else if (retryCount < maxRetries) {
                // Router chưa sẵn sàng, retry sau 100ms
                console.log(`⏳ Auth.js: Router not ready (attempt ${retryCount}/${maxRetries}), retrying in 100ms...`);
                setTimeout(attemptRedirect, 100);
            } else {
                // Fallback nếu router không load sau nhiều lần retry
                console.log('⚠️ Auth.js: Router not available after retries, using fallback redirect');
                if (isAdmin) {
                    console.log('Auth.js: Admin → redirect đến /admin/admin.html#dashboard');
                    window.location.href = '/admin/admin.html#dashboard';
                } else {
                    console.log('Auth.js: User → redirect đến /user/user.html#home');
                    window.location.href = '/user/user.html#home';
                }
            }
        };
        
        // Start redirect attempt after small delay
        console.log('Starting redirect attempt in 100ms...');
        setTimeout(attemptRedirect, 100);
        
        console.log('=== LOGIN SUCCESS ===');
        return true;
    } catch (error) {
        console.error('=== LOGIN ERROR ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Show error message
        const errorMessage = error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        console.error('Error message to show:', errorMessage);
        
        // Show error in authMessage element
        const authMessageEl = document.getElementById('authMessage');
        if (authMessageEl) {
            authMessageEl.textContent = errorMessage;
            authMessageEl.classList.remove('hidden');
            authMessageEl.classList.add('error');
            setTimeout(() => {
                authMessageEl.classList.add('hidden');
                authMessageEl.classList.remove('error');
            }, 5000);
        }
        
        // Show toast if available
        if (typeof showToast === 'function') {
            showToast(errorMessage, 'error');
        } else {
            alert(errorMessage); // Fallback to alert
        }
        
        return false;
    } finally {
        // Hide loading if function exists
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        console.log('=== LOGIN FINALLY ===');
    }
}

// Register
async function register(userData) {
    // Validation
    if (!validateEmail(userData.email)) {
        showAuthMessage('Email không hợp lệ', 'error');
        if (typeof showToast === 'function') {
            showToast('Email không hợp lệ', 'error');
        }
        return false;
    }
    
    if (userData.password.length < 6) {
        showAuthMessage('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        if (typeof showToast === 'function') {
            showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        }
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
        showAuthMessage('Đăng ký thành công', 'success');
        if (typeof showToast === 'function') {
            showToast('Đăng ký thành công', 'success');
        }
        
        // Check user roles and redirect using router
        // Extract roles from response - handle both array of objects and array of strings
        let userRoles = [];
        if (response.user?.roles) {
            userRoles = response.user.roles.map(r => {
                // Handle both {name: "admin"} and "admin" formats
                return typeof r === 'string' ? r : r.name;
            });
        } else {
            // Fallback to JWT token roles
            userRoles = getUserRoles();
        }
        
        console.log('User roles after register:', userRoles);
        
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
        const errorMsg = error.message || 'Đăng ký thất bại. Vui lòng thử lại.';
        showAuthMessage(errorMsg, 'error');
        if (typeof showToast === 'function') {
            showToast(errorMsg, 'error');
        }
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

// Show message in authMessage element
function showAuthMessage(message, type = 'error') {
    const authMessageEl = document.getElementById('authMessage');
    if (authMessageEl) {
        authMessageEl.textContent = message;
        authMessageEl.classList.remove('hidden', 'error', 'success', 'info');
        authMessageEl.classList.add(type);
        setTimeout(() => {
            authMessageEl.classList.add('hidden');
            authMessageEl.classList.remove('error', 'success', 'info');
        }, 5000);
    }
}

// Show error message (deprecated - use showAuthMessage instead)
function showError(elementId, message) {
    // Try to use authMessage if elementId is not found
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
        setTimeout(() => {
            errorEl.classList.remove('show');
        }, 5000);
    } else {
        // Fallback to authMessage
        showAuthMessage(message, 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form (for login.html - uses email field)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            
            // Check if this is login.html (has email field) or index.html (has loginUsername field)
            const emailInput = document.getElementById('email');
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('password') || document.getElementById('loginPassword');
            
            console.log('Input elements:', {
                emailInput: emailInput ? 'found' : 'not found',
                usernameInput: usernameInput ? 'found' : 'not found',
                passwordInput: passwordInput ? 'found' : 'not found'
            });
            
            // Get username/email - prioritize email field (for login.html)
            let username = '';
            if (emailInput) {
                username = emailInput.value || '';
                console.log('Using email field, value:', username);
            } else if (usernameInput) {
                username = usernameInput.value || '';
                console.log('Using username field, value:', username);
            } else {
                console.error('Neither email nor username input found!');
                if (typeof showToast === 'function') {
                    showToast('Lỗi: Không tìm thấy trường nhập liệu', 'error');
                } else {
                    alert('Lỗi: Không tìm thấy trường nhập liệu');
                }
                return;
            }
            
            // Get password
            const password = passwordInput ? (passwordInput.value || '') : '';
            console.log('Password value:', password ? '***' : 'empty');
            
            if (!username || !password) {
                const errorMsg = 'Vui lòng nhập đầy đủ thông tin';
                console.error('Validation failed:', { username: !!username, password: !!password });
                
                // Show error in authMessage element
                const authMessageEl = document.getElementById('authMessage');
                if (authMessageEl) {
                    authMessageEl.textContent = errorMsg;
                    authMessageEl.classList.remove('hidden');
                    authMessageEl.classList.add('error');
                    setTimeout(() => {
                        authMessageEl.classList.add('hidden');
                        authMessageEl.classList.remove('error');
                    }, 5000);
                }
                
                if (typeof showToast === 'function') {
                    showToast(errorMsg, 'error');
                } else {
                    alert(errorMsg);
                }
                return;
            }
            
            console.log('Calling login function with username:', username);
            await login(username, password);
        });
    } else {
        console.warn('Login form not found (id="loginForm")');
    }
    
    // Register form (for register.html and index.html)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form fields - support both register.html and index.html formats
            const fullNameEl = document.getElementById('fullName') || document.getElementById('regFullName');
            const emailEl = document.getElementById('regEmail');
            const phoneEl = document.getElementById('regPhone');
            const passwordEl = document.getElementById('regPassword');
            const confirmPasswordEl = document.getElementById('regConfirm') || document.getElementById('regConfirmPassword');
            
            // Validate password confirmation
            if (confirmPasswordEl && passwordEl && passwordEl.value !== confirmPasswordEl.value) {
                showAuthMessage('Mật khẩu xác nhận không khớp', 'error');
                if (typeof showToast === 'function') {
                    showToast('Mật khẩu xác nhận không khớp', 'error');
                }
                return;
            }
            
            const userData = {
                email: emailEl ? emailEl.value : '',
                full_name: fullNameEl ? fullNameEl.value : '',
                password: passwordEl ? passwordEl.value : ''
            };
            
            // Add phone if available (for register.html)
            if (phoneEl && phoneEl.value) {
                userData.phone = phoneEl.value;
            }
            
            // Use email as username if username field not found
            if (!document.getElementById('regUsername')) {
                userData.username = userData.email;
            } else {
                userData.username = document.getElementById('regUsername').value;
            }
            
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

