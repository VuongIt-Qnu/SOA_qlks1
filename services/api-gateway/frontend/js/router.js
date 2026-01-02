/**
 * Router Class - Quản lý điều hướng và routing cho ứng dụng
 * Xử lý routing cho login, register và các trang khác
 */
class Router {
    constructor() {
        this.routes = new Map();
        this.currentPage = null;
        this.authRequired = new Set(['dashboard', 'customers', 'rooms', 'bookings', 'payments', 'reports']);
        this.init();
    }

    /**
     * Khởi tạo router
     */
    init() {
        // Đăng ký các routes
        this.registerRoutes();
        
        // Lắng nghe sự kiện popstate (back/forward browser)
        window.addEventListener('popstate', (e) => {
            this.handleRoute();
        });
        
        // Xử lý route ban đầu
        this.handleRoute();
    }

    /**
     * Đăng ký các routes
     */
    registerRoutes() {
        // Public routes (không cần auth)
        this.routes.set('login', {
            path: '/login',
            handler: () => this.showLoginPage(),
            authRequired: false
        });

        this.routes.set('register', {
            path: '/register',
            handler: () => this.showRegisterPage(),
            authRequired: false
        });

        // Protected routes (cần auth)
        this.routes.set('dashboard', {
            path: '/dashboard',
            handler: () => this.showPage('dashboard'),
            authRequired: true
        });

        this.routes.set('customers', {
            path: '/customers',
            handler: () => this.showPage('customers'),
            authRequired: true
        });

        this.routes.set('rooms', {
            path: '/rooms',
            handler: () => this.showPage('rooms'),
            authRequired: true
        });

        this.routes.set('bookings', {
            path: '/bookings',
            handler: () => this.showPage('bookings'),
            authRequired: true
        });

        this.routes.set('payments', {
            path: '/payments',
            handler: () => this.showPage('payments'),
            authRequired: true
        });

        this.routes.set('reports', {
            path: '/reports',
            handler: () => this.showPage('reports'),
            authRequired: true
        });

        // User routes
        this.routes.set('home', {
            path: '/home',
            handler: () => this.showUserPage('home'),
            authRequired: false
        });

        this.routes.set('myBookings', {
            path: '/my-bookings',
            handler: () => this.showUserPage('myBookings'),
            authRequired: true
        });
    }

    /**
     * Xử lý route hiện tại
     */
    handleRoute() {
        const path = window.location.pathname;
        const hash = window.location.hash.slice(1); // Bỏ dấu #
        
        // Ưu tiên hash nếu có
        const routeName = hash || this.getRouteFromPath(path);
        
        if (routeName) {
            this.navigate(routeName, false); // false = không push state
        } else {
            // Route mặc định
            this.navigateToDefault();
        }
    }

    /**
     * Lấy route name từ path
     */
    getRouteFromPath(path) {
        for (const [name, route] of this.routes) {
            if (path.includes(route.path) || path === route.path) {
                return name;
            }
        }
        return null;
    }

    /**
     * Điều hướng đến route
     * @param {string} routeName - Tên route
     * @param {boolean} pushState - Có push vào history không
     */
    navigate(routeName, pushState = true) {
        const route = this.routes.get(routeName);
        
        if (!route) {
            console.warn(`Route "${routeName}" not found`);
            this.navigateToDefault();
            return;
        }

        // Kiểm tra authentication
        if (route.authRequired && !this.isAuthenticated()) {
            this.redirectToLogin();
            return;
        }

        // Nếu đã đăng nhập và cố vào login/register, redirect về dashboard
        if ((routeName === 'login' || routeName === 'register') && this.isAuthenticated()) {
            this.redirectAfterLogin();
            return;
        }

        // Thực thi handler
        route.handler();
        this.currentPage = routeName;

        // Update URL
        if (pushState) {
            const url = route.path || `#${routeName}`;
            window.history.pushState({ route: routeName }, '', url);
        }
    }

    /**
     * Điều hướng đến trang mặc định
     * Logic: Luôn bắt đầu từ login/register, sau đó redirect dựa trên role
     */
    navigateToDefault() {
        // Nếu chưa đăng nhập → luôn redirect về login/register
        if (!this.isAuthenticated()) {
            // Nếu đang ở admin.html → redirect về user.html để login
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'user.html#login';
                return;
            }
            // Nếu đang ở user.html → hiển thị login
            if (window.location.pathname.includes('user.html')) {
                this.navigate('login', false);
                return;
            }
            // index.html hoặc trang khác → redirect về user.html để login
            window.location.href = 'user.html#login';
            return;
        }
        
        // Đã đăng nhập → kiểm tra role để redirect
        const roles = getUserRoles();
        
        // Admin/Manager/Receptionist → admin.html
        if (roles.includes('admin') || roles.includes('manager') || roles.includes('receptionist')) {
            if (window.location.pathname.includes('admin.html')) {
                // Đã ở admin.html → hiển thị dashboard
                this.navigate('dashboard', false);
            } else {
                // Chưa ở admin.html → redirect đến admin.html
                window.location.href = 'admin.html#dashboard';
            }
        } else {
            // Customer hoặc user khác → user.html
            if (window.location.pathname.includes('user.html')) {
                // Đã ở user.html → hiển thị home
                this.navigate('home', false);
            } else {
                // Chưa ở user.html → redirect đến user.html
                window.location.href = 'user.html#home';
            }
        }
    }

    /**
     * Hiển thị trang login
     * Logic: Luôn hiển thị login trên user.html (modal hoặc page)
     */
    showLoginPage() {
        // Kiểm tra xem đang ở trang nào
        if (document.body.classList.contains('user-layout')) {
            // User page - hiển thị modal login
            if (typeof showLoginModal === 'function') {
                showLoginModal();
            } else {
                // Fallback: hiển thị login form nếu có
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                }
            }
        } else if (document.body.classList.contains('admin-layout')) {
            // Admin page - redirect về user page để login
            window.location.href = 'user.html#login';
        } else {
            // index.html hoặc trang khác - redirect về user.html
            window.location.href = 'user.html#login';
        }
    }

    /**
     * Hiển thị trang register
     * Logic: Luôn hiển thị register trên user.html (modal hoặc page)
     */
    showRegisterPage() {
        // Kiểm tra xem đang ở trang nào
        if (document.body.classList.contains('user-layout')) {
            // User page - hiển thị modal register
            if (typeof showRegisterModal === 'function') {
                showRegisterModal();
            } else {
                // Fallback: hiển thị register form nếu có
                const registerModal = document.getElementById('registerModal');
                if (registerModal) {
                    registerModal.style.display = 'flex';
                }
            }
        } else if (document.body.classList.contains('admin-layout')) {
            // Admin page - redirect về user page để register
            window.location.href = 'user.html#register';
        } else {
            // index.html hoặc trang khác - redirect về user.html
            window.location.href = 'user.html#register';
        }
    }

    /**
     * Hiển thị page (cho index.html)
     */
    showPage(pageName) {
        if (typeof window.showPage === 'function') {
            window.showPage(pageName);
        }
    }

    /**
     * Hiển thị user page (cho user.html)
     */
    showUserPage(pageName) {
        if (typeof window.showUserPage === 'function') {
            window.showUserPage(pageName);
        }
    }

    /**
     * Kiểm tra xem user đã đăng nhập chưa
     */
    isAuthenticated() {
        return !!getToken();
    }

    /**
     * Redirect đến trang login
     * Luôn redirect về user.html#login để đăng nhập
     */
    redirectToLogin() {
        // Luôn redirect về user.html để login
        if (!window.location.pathname.includes('user.html')) {
            window.location.href = 'user.html#login';
        } else {
            this.navigate('login', false);
        }
    }

    /**
     * Redirect sau khi đăng nhập thành công (khi đã đăng nhập mà cố vào login/register)
     * Logic: Admin → admin.html, User khác → user.html
     */
    redirectAfterLogin() {
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

    /**
     * Xử lý sau khi đăng nhập thành công
     * Logic: Admin → admin.html, User khác → user.html
     */
    onLoginSuccess(userRoles) {
        // Kiểm tra role
        const isAdmin = userRoles.includes('admin') || 
                       userRoles.includes('manager') || 
                       userRoles.includes('receptionist');
        
        if (isAdmin) {
            // Tài khoản admin → chuyển đến admin.html
            window.location.href = 'admin.html#dashboard';
        } else {
            // Tài khoản user khác (customer) → chuyển đến user.html
            window.location.href = 'user.html#home';
        }
    }

    /**
     * Xử lý sau khi đăng ký thành công
     * Logic: Admin → admin.html, User khác → user.html
     */
    onRegisterSuccess(userRoles) {
        // Tương tự như login
        this.onLoginSuccess(userRoles);
    }

    /**
     * Logout và redirect
     */
    logout() {
        if (typeof removeToken === 'function') {
            removeToken();
        }
        this.currentPage = null;
        
        // Redirect về trang login
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'user.html#login';
        } else {
            this.navigate('login');
        }
    }
}

// Tạo instance router global
const router = new Router();

// Export
window.Router = Router;
window.router = router;

