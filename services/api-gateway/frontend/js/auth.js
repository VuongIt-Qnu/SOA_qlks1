// ========= Auth page logic (safe, no "authAPI not ready") =========
(function () {
  // set background image for left panel
  function applyBg() {
    const bg = window.AUTH_BG_IMAGE || "/image/login%20and%20register.jpg";
    document.documentElement.style.setProperty("--auth-bg", `url("${bg}")`);
  }

  function ensureAuthMessageEl() {
    let el = document.getElementById("authMessage");
    if (!el) {
      el = document.createElement("div");
      el.id = "authMessage";
      el.className = "auth-message hidden";
      document.body.appendChild(el);
    }
    return el;
  }

  function showAuthMessage(message, type = "error") {
    const el = ensureAuthMessageEl();
    el.textContent = message;
    el.classList.remove("hidden", "error", "success", "info");
    el.classList.add(type);

    window.clearTimeout(showAuthMessage._t);
    showAuthMessage._t = window.setTimeout(() => {
      el.classList.add("hidden");
      el.classList.remove("error", "success", "info");
    }, 5000);
  }

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = !!isLoading;
    if (isLoading) {
      btn.dataset._oldText = btn.textContent;
      btn.textContent = "Please wait...";
    } else {
      btn.textContent = btn.dataset._oldText || btn.textContent;
      delete btn.dataset._oldText;
    }
  }

  function getRolesFromResponseOrToken(res) {
    if (res && res.user && Array.isArray(res.user.roles)) {
      return res.user.roles.map(r => {
        if (typeof r === "string") return r.toLowerCase().trim();
        if (r && typeof r === "object" && r.name) return String(r.name).toLowerCase().trim();
        return String(r).toLowerCase().trim();
      });
    }
    if (typeof window.getUserRoles === "function") {
      const roles = window.getUserRoles();
      if (Array.isArray(roles)) return roles.map(x => String(x).toLowerCase().trim());
      if (roles) return [String(roles).toLowerCase().trim()];
    }
    return [];
  }

  function isAdminRoles(roles) {
    if (typeof window.checkIsAdmin !== "undefined") {
      try { return window.checkIsAdmin(roles); } catch (_) {}
    }
    const adminRoles = ["admin", "manager", "receptionist"];
    return Array.isArray(roles) && roles.some(r => adminRoles.includes(String(r).toLowerCase().trim()));
  }

<<<<<<< HEAD
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
=======
  // ✅ Wait until api.js attaches window.authAPI
  async function waitForAuthAPI(timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.authAPI && typeof window.authAPI.login === "function" && typeof window.authAPI.register === "function") {
>>>>>>> 88ea35c (update)
        return true;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  }

  async function doLogin(username, password) {
    const ok = await waitForAuthAPI(5000);
    if (!ok) throw new Error("Hệ thống API chưa sẵn sàng (api.js). Hãy hard reload Ctrl+Shift+R.");

    const res = await window.authAPI.login(username, password);
    if (!res || !res.access_token) throw new Error("Phản hồi login không hợp lệ (thiếu access_token).");

    if (typeof window.setToken !== "function") throw new Error("setToken chưa tồn tại (kiểm tra /js/jwt-utils.js).");
    window.setToken(res.access_token);

    // load me (optional)
    try {
      if (window.authAPI.getMe && typeof window.authAPI.getMe === "function") {
        window.currentUser = await window.authAPI.getMe();
      } else {
        window.currentUser = res.user || null;
      }
    } catch (_) {
      window.currentUser = res.user || null;
    }

    const roles = getRolesFromResponseOrToken(res);

    // redirect
    if (window.router && typeof window.router.onLoginSuccess === "function") {
      window.router.onLoginSuccess(roles);
    } else {
      if (isAdminRoles(roles)) window.location.href = "/admin/admin.html#dashboard";
      else window.location.href = "/user/user.html#home";
    }
    return true;
  }

<<<<<<< HEAD
// // Show message in authMessage element
// function showAuthMessage(message, type = 'error') {
//     const authMessageEl = document.getElementById('authMessage');
//     if (authMessageEl) {
//         authMessageEl.textContent = message;
//         authMessageEl.classList.remove('hidden', 'error', 'success', 'info');
//         authMessageEl.classList.add(type);
//         setTimeout(() => {
//             authMessageEl.classList.add('hidden');
//             authMessageEl.classList.remove('error', 'success', 'info');
//         }, 5000);
//     }
// }

function showAuthMessage(message, type = "error") {
  const el = document.getElementById("authMessage");
  if (!el) return;

  el.textContent = message;
  el.className = `auth-message ${type}`;
  el.classList.remove("hidden");
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
=======
  async function doRegister(userData) {
    const ok = await waitForAuthAPI(5000);
    if (!ok) throw new Error("Hệ thống API chưa sẵn sàng (api.js). Hãy hard reload Ctrl+Shift+R.");

    const res = await window.authAPI.register(userData);
    if (!res || !res.access_token) throw new Error("Phản hồi register không hợp lệ (thiếu access_token).");

    if (typeof window.setToken !== "function") throw new Error("setToken chưa tồn tại (kiểm tra /js/jwt-utils.js).");
    window.setToken(res.access_token);
    window.currentUser = res.user || null;

    const roles = getRolesFromResponseOrToken(res);

    if (window.router && typeof window.router.onLoginSuccess === "function") {
      window.router.onLoginSuccess(roles);
>>>>>>> 88ea35c (update)
    } else {
      if (isAdminRoles(roles)) window.location.href = "/admin/admin.html#dashboard";
      else window.location.href = "/user/user.html#home";
    }
    return true;
  }

  // prevent double submit
  let loginInProgress = false;
  let registerInProgress = false;

  document.addEventListener("DOMContentLoaded", async () => {
    applyBg();

    // warm up (so user click nhanh cũng ok)
    await waitForAuthAPI(5000);

    // ----- LOGIN -----
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      const btn = document.getElementById("loginBtnSubmit") || document.querySelector("#loginForm button[type='submit']");
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (loginInProgress) return;

        loginInProgress = true;
        setButtonLoading(btn, true);

        try {
          const username = (document.getElementById("email")?.value || "").trim();
          const password = (document.getElementById("password")?.value || "").trim();

          if (!username || !password) {
            showAuthMessage("Vui lòng nhập đầy đủ Email và Password.", "error");
            return;
          }

          showAuthMessage("Đang đăng nhập...", "info");
          await doLogin(username, password);
        } catch (err) {
          const msg = err?.message || "Đăng nhập thất bại. Vui lòng thử lại.";
          showAuthMessage(msg, "error");
          if (typeof window.showToast === "function") {
            try { window.showToast(msg, "error"); } catch (_) {}
          }
        } finally {
          loginInProgress = false;
          setButtonLoading(btn, false);
        }
      });
    }

    // ----- REGISTER -----
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      const btn = document.getElementById("registerBtnSubmit") || document.querySelector("#registerForm button[type='submit']");
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (registerInProgress) return;

        registerInProgress = true;
        setButtonLoading(btn, true);

        try {
          const fullName = (document.getElementById("fullName")?.value || "").trim();
          const email = (document.getElementById("regEmail")?.value || "").trim();
          const password = (document.getElementById("regPassword")?.value || "").trim();
          const confirm = (document.getElementById("regConfirm")?.value || "").trim();
          const phone = (document.getElementById("regPhone")?.value || "").trim();

          if (!fullName || !email || !password || !confirm) {
            showAuthMessage("Vui lòng nhập đầy đủ thông tin đăng ký.", "error");
            return;
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            showAuthMessage("Email không hợp lệ.", "error");
            return;
          }
          if (password.length < 6) {
            showAuthMessage("Mật khẩu phải có ít nhất 6 ký tự.", "error");
            return;
          }
          if (password !== confirm) {
            showAuthMessage("Mật khẩu xác nhận không khớp.", "error");
            return;
          }

          showAuthMessage("Đang tạo tài khoản...", "info");

          // phù hợp API backend của bạn
          const userData = {
            username: email,
            email,
            full_name: fullName,
            password,
            role_name: "customer"
          };

          // nếu backend nhận phone thì thêm
          if (phone) userData.phone = phone;

          await doRegister(userData);
        } catch (err) {
          const msg = err?.message || "Đăng ký thất bại. Vui lòng thử lại.";
          showAuthMessage(msg, "error");
          if (typeof window.showToast === "function") {
            try { window.showToast(msg, "error"); } catch (_) {}
          }
        } finally {
          registerInProgress = false;
          setButtonLoading(btn, false);
        }
      });
    }
  });
})();
