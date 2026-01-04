

class Router {
    constructor() {
        this.init();
    }

    init() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.handle());
        } else {
            this.handle();
        }

        // Listen for hash changes
        window.addEventListener("hashchange", () => {
            console.log('Router: Hash changed to', window.location.hash);
            this.handle();
        });
        
        window.addEventListener("popstate", () => this.handle());
    }

    handle() {
        const path = window.location.pathname;
        const hash = window.location.hash;

        const token = getToken();
        const roles = token ? getUserRoles() : [];
        
        // Normalize roles to array of lowercase strings
        let normalizedRoles = [];
        if (Array.isArray(roles)) {
            normalizedRoles = roles.map(r => {
                let roleStr = '';
                if (typeof r === 'string') {
                    roleStr = r;
                } else if (r && typeof r === 'object' && r.name) {
                    roleStr = r.name;
                } else {
                    roleStr = String(r);
                }
                // Normalize to lowercase and trim
                return roleStr.toLowerCase().trim();
            });
        } else if (roles) {
            normalizedRoles = [String(roles).toLowerCase().trim()];
        }
        
        console.log('Router.handle: roles from getUserRoles()=', roles);
        console.log('Router.handle: normalizedRoles=', normalizedRoles);

        // Check admin roles (case-insensitive) - use helper if available
        const adminRoles = ["admin", "manager", "receptionist"];
        const isAdmin = typeof checkIsAdmin !== 'undefined' 
            ? checkIsAdmin(normalizedRoles) 
            : normalizedRoles.some(role => adminRoles.includes(role));
        
        console.log('Router.handle: isAdmin=', isAdmin, 'path=', path, 'hash=', hash);

        // ===== ENTRY POINT: index.html =====
        // index.html sẽ tự redirect trong script của nó, router không cần xử lý
        if (path === "/" || path === "/index.html" || path.includes("index.html")) {
            // index.html đã có logic redirect riêng, không cần xử lý thêm
            return;
        }

        // ===== PUBLIC PAGES =====
        if (
            path.includes("login.html") ||
            path.includes("register.html")
        ) {
            // Đã login mà còn vào login/register → redirect sau login
            if (token) {
                this.redirectAfterLogin(isAdmin);
            }
            return;
        }

        // ===== CHƯA LOGIN =====
        if (!token) {
            // Cố vào admin/user khi chưa login → về login
            if (!path.includes("user/user.html")) {
                window.location.href = "user/user.html#login";
            } else if (hash !== "#login" && hash !== "") {
                // Đang ở user page nhưng không phải #login → về #login
                window.location.hash = "login";
            }
            return;
        }

        // ===== ĐÃ LOGIN – CHECK KHU VỰC =====
        if (path.includes("admin/admin.html") && !isAdmin) {
            console.log('Router: User không phải admin, redirect đến user/user.html#home');
            window.location.href = "user/user.html#home";
            return;
        }
        if (path.includes("user/user.html") && isAdmin) {
            console.log('Router: User là admin nhưng đang ở user page, redirect đến admin/admin.html#dashboard');
            window.location.href = "admin/admin.html#dashboard";
            return;
        }

        // ===== ĐÃ LOGIN - XỬ LÝ HASH ROUTING =====
        // Nếu đang ở user.html#login sau khi đã login → redirect đến #home
        if (path.includes("user/user.html") && (hash === "#login" || hash === "") && token) {
            console.log('Router: Đã login nhưng đang ở #login hoặc không có hash, redirect đến #home');
            // Đổi hash ngay lập tức
            window.location.hash = "home";
            // Show page ngay, không cần setTimeout
            this.showPage("home");
            return;
        }

        // Nếu đang ở admin.html#login sau khi đã login → redirect đến #dashboard
        if (path.includes("admin/admin.html") && (hash === "#login" || hash === "") && token) {
            console.log('Router: Đã login nhưng đang ở #login hoặc không có hash, redirect đến #dashboard');
            // Đổi hash ngay lập tức
            window.location.hash = "dashboard";
            // Show page ngay, không cần setTimeout
            this.showPage("dashboard");
            return;
        }

        // ===== HASH ROUTING (SPA nội bộ) =====
        if (hash) {
            const page = hash.replace("#", "");
            this.showPage(page);
        } else {
            // Nếu không có hash và đang ở user.html hoặc admin.html, set hash mặc định
            if (path.includes("user/user.html")) {
                window.location.hash = "home";
                this.showPage("home");
            } else if (path.includes("admin/admin.html")) {
                window.location.hash = "dashboard";
                this.showPage("dashboard");
            }
        }
    }

    showPage(page) {
        if (document.body.classList.contains("admin-layout")) {
            if (typeof showAdminPage === "function") {
                showAdminPage(page);
            }
        }

        if (document.body.classList.contains("user-layout")) {
            if (typeof showUserPage === "function") {
                showUserPage(page);
            }
        }
    }

    // ===== CHỈ DÙNG SAU LOGIN =====
    redirectAfterLogin(isAdmin) {
        console.log('Router.redirectAfterLogin: isAdmin=', isAdmin);
        
            if (isAdmin) {
            // Admin → luôn redirect đến admin/admin.html#dashboard
            console.log('Router: Admin user → redirect đến admin/admin.html#dashboard');
            window.location.href = "admin/admin.html#dashboard";
        } else {
            // User thường → luôn redirect đến user/user.html#home
            console.log('Router: Regular user → redirect đến user/user.html#home');
            window.location.href = "user/user.html#home";
        }
    }

    onLoginSuccess(userRoles) {
        console.log('Router.onLoginSuccess: userRoles=', userRoles);
        
        // Normalize roles to array of lowercase strings
        let roles = [];
        if (Array.isArray(userRoles)) {
            roles = userRoles.map(r => {
                let roleStr = '';
                if (typeof r === 'string') {
                    roleStr = r;
                } else if (r && typeof r === 'object' && r.name) {
                    roleStr = r.name;
                } else {
                    roleStr = String(r);
                }
                // Normalize to lowercase and trim
                return roleStr.toLowerCase().trim();
            });
        } else if (userRoles) {
            roles = [String(userRoles).toLowerCase().trim()];
        }
        
        console.log('Router.onLoginSuccess: roles normalized=', roles);
        
        // Check if user has admin role (case-insensitive) - use helper if available
        const adminRoles = ["admin", "manager", "receptionist"];
        const isAdmin = typeof checkIsAdmin !== 'undefined' 
            ? checkIsAdmin(roles) 
            : roles.some(role => adminRoles.includes(role));
        
        console.log('Router.onLoginSuccess: isAdmin=', isAdmin);

        if (!getToken()) {
            console.error("Router.onLoginSuccess: Token chưa được lưu!");
            return;
        }

        // Redirect based on role
        this.redirectAfterLogin(isAdmin);
    }

    logout() {
        if (typeof removeToken === "function") {
            removeToken();
        }
        window.location.href = "login.html";
    }
}

// Global router
window.router = new Router();
