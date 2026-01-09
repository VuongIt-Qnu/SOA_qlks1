// User interface functionality

// Use window.currentUser as global variable to avoid conflicts
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}
let featuredRooms = [];
let searchFilters = null; // { checkIn, checkOut, guests }

// Room type images mapping - Using high-quality hotel room images from Unsplash
const ROOM_IMAGES = {
    'standard': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop&q=80',
    'deluxe': 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop&q=80',
    'superior': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop&q=80',
    'suite': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&q=80',
    'family': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop&q=80',
    'presidential': 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=600&fit=crop&q=80',
    'executive': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop&q=80',
    'penthouse': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop&q=80',
    'ocean view': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80'
};

// Get room image URL based on room type name
function getRoomImageUrl(roomTypeName) {
    if (!roomTypeName) return ROOM_IMAGES.default;
    
    const name = roomTypeName.toLowerCase().trim();
    
    // Direct match
    if (ROOM_IMAGES[name]) {
        return ROOM_IMAGES[name];
    }
    
    // Partial match
    if (name.includes('standard')) return ROOM_IMAGES.standard;
    if (name.includes('deluxe')) return ROOM_IMAGES.deluxe;
    if (name.includes('superior')) return ROOM_IMAGES.superior;
    if (name.includes('suite')) return ROOM_IMAGES.suite;
    if (name.includes('family')) return ROOM_IMAGES.family;
    if (name.includes('presidential')) return ROOM_IMAGES.presidential;
    if (name.includes('executive')) return ROOM_IMAGES.executive;
    
    return ROOM_IMAGES.default;
}

// Initialize user interface
document.addEventListener('DOMContentLoaded', () => {
    checkUserAuth();
    loadFeaturedRooms();
    setupEventListeners();
    setupSearchForm();
});

// Setup search form defaults and validation
function setupSearchForm() {
    const checkInInput = document.getElementById('searchCheckIn');
    const checkOutInput = document.getElementById('searchCheckOut');
    
    if (checkInInput && checkOutInput) {
        // Set min date to today
        const today = new Date().toISOString().split('T')[0];
        checkInInput.min = today;
        checkOutInput.min = today;
        
        // Set default dates (tomorrow and day after)
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        checkInInput.value = tomorrow;
        checkOutInput.value = dayAfter;
        
        // Update check-out min when check-in changes
        checkInInput.addEventListener('change', () => {
            const checkInDate = new Date(checkInInput.value);
            checkInDate.setDate(checkInDate.getDate() + 1);
            checkOutInput.min = checkInDate.toISOString().split('T')[0];
            if (checkOutInput.value <= checkInInput.value) {
                checkOutInput.value = checkInDate.toISOString().split('T')[0];
            }
        });
    }
}

// Check user authentication
async function checkUserAuth() {
    const token = getToken();
    if (token) {
        try {
            console.log('[checkUserAuth] Token found, calling authAPI.getMe()...');
            window.currentUser = await authAPI.getMe();
            console.log('[checkUserAuth] User info loaded successfully:', window.currentUser);
            showAuthenticatedUI();
        } catch (error) {
            console.error('[checkUserAuth] Failed to load user info:', error);
            console.error('[checkUserAuth] Error status:', error.status);
            console.error('[checkUserAuth] Error message:', error.message);
            
            // Only remove token if it's a real authentication error (401/403)
            // Don't logout on network errors or other issues
            if (error.status === 401 || error.status === 403) {
                console.warn('[checkUserAuth] Authentication failed, removing token');
                removeToken();
                showUnauthenticatedUI();
            } else {
                // For other errors, keep token and show error message
                console.warn('[checkUserAuth] Non-auth error, keeping token');
                if (typeof showToast === 'function') {
                    showToast('Không thể tải thông tin người dùng. Vui lòng thử lại.', 'warning');
                }
            }
        }
    } else {
        console.log('[checkUserAuth] No token found');
        showUnauthenticatedUI();
    }
}

// Show authenticated UI
function showAuthenticatedUI() {
    document.getElementById('userLoginBtn').style.display = 'none';
    document.getElementById('userLogoutBtn').style.display = 'inline-flex';
    document.getElementById('profileNav').style.display = 'inline-flex';
}

// Show unauthenticated UI
function showUnauthenticatedUI() {
    document.getElementById('userLoginBtn').style.display = 'inline-flex';
    document.getElementById('userLogoutBtn').style.display = 'none';
    document.getElementById('profileNav').style.display = 'none';
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page || (item.id === 'profileNav' ? 'profile' : null);
            if (page) {
                showUserPage(page);
            }
        });
    });
    
    // Login button - redirect to login page
    document.getElementById('userLoginBtn').addEventListener('click', () => {
        window.location.href = '/login.html';
    });
    
    // Logout button
    document.getElementById('userLogoutBtn').addEventListener('click', () => {
        logout();
    });
    
    // Login form
    const userLoginForm = document.getElementById('userLoginForm');
    if (userLoginForm) {
        userLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('userLoginUsername').value;
            const password = document.getElementById('userLoginPassword').value;
            
            if (!username || !password) {
                showToast('Vui lòng điền đầy đủ thông tin', 'warning');
                return;
            }
            
            try {
                showLoading();
                const response = await authAPI.login(username, password);
                
                // Debug: Log token before saving
                console.log('Login response:', response);
                console.log('Access token received:', response.access_token ? response.access_token.substring(0, 30) + '...' : 'null');
                
                // Save token
                setToken(response.access_token);
                
                // Verify token was saved
                const savedToken = getToken();
                console.log('[Login] Token saved to localStorage:', savedToken ? savedToken.substring(0, 30) + '...' : 'null');
                
                if (!savedToken) {
                    console.error('[Login] ERROR: Token was not saved to localStorage!');
                    showToast('Lỗi: Không thể lưu token. Vui lòng thử lại.', 'error');
                    return;
                }
                
                // Set user info from response (don't need to call getMe immediately)
                if (response.user) {
                    window.currentUser = response.user;
                    console.log('[Login] User info set from response:', window.currentUser);
                }
                
                showToast('Đăng nhập thành công', 'success');
                closeLoginModal();
                
                // Small delay before checking auth to ensure token is saved
                setTimeout(() => {
                    checkUserAuth();
                }, 100);
                
                // Check if admin, redirect to admin page
                // Extract roles from response - handle both array of objects and array of strings
                let userRoles = [];
                if (response.user?.roles) {
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
                        return roleStr.toLowerCase().trim();
                    });
                } else {
                    // Fallback to JWT token roles (already normalized in getUserRoles)
                    userRoles = getUserRoles();
                }
                
                console.log('User.js: User roles after login:', userRoles);
                console.log('User.js: User roles type:', typeof userRoles, Array.isArray(userRoles));
                
                // Verify token is saved before redirect
                const tokenCheck = getToken();
                if (!tokenCheck) {
                    console.error('ERROR: Token not found after setToken!');
                    showToast('Lỗi: Token không được lưu. Vui lòng đăng nhập lại.', 'error');
                    return;
                }
                
                // Check if admin using helper function (consistent check)
                const isAdmin = typeof checkIsAdmin !== 'undefined' 
                    ? checkIsAdmin(userRoles) 
                    : userRoles.some(role => ['admin', 'manager', 'receptionist'].includes(role.toLowerCase().trim()));
                console.log('User.js: Is admin?', isAdmin, 'roles:', userRoles);
                
                // Retry mechanism to ensure router is ready
                let retryCount = 0;
                const maxRetries = 5;
                
                const attemptRedirect = () => {
                    retryCount++;
                    console.log(`User.js: Redirect attempt ${retryCount}/${maxRetries}`);
                    
                    // Sử dụng router để điều hướng khi login thành công
                    if (typeof window.router !== 'undefined' && window.router.onLoginSuccess) {
                        console.log('User.js: Using router.onLoginSuccess');
                        window.router.onLoginSuccess(userRoles);
                    } else if (retryCount < maxRetries) {
                        // Router chưa sẵn sàng, retry sau 100ms
                        console.log('User.js: Router not ready, retrying...');
                        setTimeout(attemptRedirect, 100);
                    } else {
                        // Fallback nếu router không load sau nhiều lần retry
                        console.log('User.js: Router not available after retries, using fallback redirect');
                        if (isAdmin) {
                            console.log('User.js: Admin → redirect đến admin/admin.html#dashboard');
                            window.location.href = 'admin/admin.html#dashboard';
                        } else {
                            console.log('User.js: User → redirect đến user/user.html#home');
                            window.location.href = 'user/user.html#home';
                        }
                    }
                };
                
                // Start redirect attempt after small delay
                setTimeout(attemptRedirect, 100);
            } catch (error) {
                console.error('Login error:', error);
                let errorMsg = error.message || 'Đăng nhập thất bại';
                
                // Translate common error messages to Vietnamese
                if (errorMsg.includes('Incorrect username or password') || errorMsg.includes('incorrect')) {
                    errorMsg = 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
                } else if (errorMsg.includes('disabled') || errorMsg.includes('account is disabled')) {
                    errorMsg = 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
                } else if (errorMsg.includes('Invalid token') || errorMsg.includes('token')) {
                    errorMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                }
                
                showToast(errorMsg, 'error');
                const errorEl = document.getElementById('userLoginError');
                if (errorEl) {
                    errorEl.textContent = errorMsg;
                    errorEl.style.display = 'block';
                    errorEl.style.color = '#ef4444';
                }
            } finally {
                hideLoading();
            }
        });
    }
    
    // Register form
    const userRegisterForm = document.getElementById('userRegisterForm');
    if (userRegisterForm) {
        userRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                username: document.getElementById('userRegUsername').value,
                email: document.getElementById('userRegEmail').value,
                full_name: document.getElementById('userRegFullName').value,
                password: document.getElementById('userRegPassword').value,
                role_name: 'customer'
            };
            
            if (!userData.username || !userData.email || !userData.full_name || !userData.password) {
                showToast('Vui lòng điền đầy đủ thông tin', 'warning');
                return;
            }
            
            if (userData.password.length < 6) {
                showToast('Mật khẩu phải có ít nhất 6 ký tự', 'warning');
                return;
            }
            
            try {
                showLoading();
                const response = await authAPI.register(userData);
                setToken(response.access_token);
                showToast('Đăng ký thành công', 'success');
                closeRegisterModal();
                checkUserAuth();
                
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
                    // Fallback
                    if (userRoles.includes('admin') || userRoles.includes('manager') || userRoles.includes('receptionist')) {
                        window.location.href = 'admin/admin.html#dashboard';
                    } else {
                        window.location.href = 'user/user.html#home';
                    }
                }
            } catch (error) {
                console.error('Register error:', error);
                let errorMsg = error.message || 'Đăng ký thất bại';
                
                // Translate common error messages to Vietnamese
                if (errorMsg.includes('already registered') || errorMsg.includes('Username or email already registered')) {
                    errorMsg = 'Tên đăng nhập hoặc email đã được sử dụng. Vui lòng chọn tên khác.';
                } else if (errorMsg.includes('email')) {
                    errorMsg = 'Email không hợp lệ hoặc đã được sử dụng.';
                } else if (errorMsg.includes('username')) {
                    errorMsg = 'Tên đăng nhập không hợp lệ hoặc đã được sử dụng.';
                }
                
                showToast(errorMsg, 'error');
                const errorEl = document.getElementById('userRegisterError');
                if (errorEl) {
                    errorEl.textContent = errorMsg;
                    errorEl.style.display = 'block';
                    errorEl.style.color = '#ef4444';
                }
            } finally {
                hideLoading();
            }
        });
    }
}

// Show user page
function showUserPage(pageName) {
    document.querySelectorAll('.user-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Handle page name mapping
    let pageId = pageName;
    if (pageName === 'profile') {
        pageId = 'profilePage';
    } else {
        pageId = `${pageName}Page`;
    }
    
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName || (pageName === 'profile' && item.id === 'profileNav')) {
            item.classList.add('active');
        }
    });
    
    // Load page data
    loadUserPageData(pageName);
}

// Load user page data
function loadUserPageData(pageName) {
    switch(pageName) {
        case 'home':
            loadFeaturedRooms();
            break;
        case 'rooms':
            loadAllRooms(searchFilters);
            break;
        case 'myBookings':
            loadMyBookings();
            break;
        case 'profile':
            loadProfileData();
            break;
    }
}

// Load featured rooms
async function loadFeaturedRooms() {
    try {
        showLoading();
        const roomTypes = await roomAPI.getRoomTypes();
        const rooms = await roomAPI.getRooms({ status: 'available' });
        
        // Get featured room types (first 4)
        featuredRooms = roomTypes.slice(0, 4);
        
        const grid = document.getElementById('featuredRoomsGrid');
        if (grid) {
            grid.innerHTML = featuredRooms.map(roomType => {
                const availableRooms = rooms.filter(r => r.room_type_id === roomType.id);
                const imageUrl = getRoomImageUrl(roomType.name);
                return `
                    <div class="room-card" onclick="viewRoomDetail(${roomType.id})">
                        <div class="room-image">
                            <img src="${imageUrl}" alt="${roomType.name}" class="room-img" loading="lazy" 
                                 onerror="this.onerror=null; this.src='${ROOM_IMAGES.default}';" />
                            <span class="rating-badge">5</span>
                        </div>
                        <div class="room-info">
                            <h3 class="room-name">${roomType.name}</h3>
                            <p class="room-type">${roomType.name} • Guests ${roomType.max_occupancy}</p>
                            <div class="room-footer">
                                <span class="room-price">${formatCurrency(roomType.price_per_night)} / night</span>
                                <button class="btn btn-book" onclick="event.stopPropagation(); viewRoomDetail(${roomType.id})">
                                    Xem chi tiết
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load featured rooms:', error);
        showToast('Không thể tải danh sách phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Load all rooms (supports search filters)
async function loadAllRooms(filters = null) {
    try {
        showLoading();

        const appliedFilters = filters || searchFilters;

        const roomTypes = await roomAPI.getRoomTypes();
        let rooms = [];

        if (appliedFilters?.checkIn && appliedFilters?.checkOut) {
            // Lọc theo khoảng ngày
            rooms = await roomAPI.getAvailableRooms(appliedFilters.checkIn, appliedFilters.checkOut);
        } else {
            // Không có filter ngày -> lấy toàn bộ
            rooms = await roomAPI.getRooms();
        }

        const grid = document.getElementById('roomsGrid');
        if (grid) {
            const cards = roomTypes
                .map(roomType => {
                    // Lọc phòng theo room type
                    let availableRooms = rooms.filter(r => r.room_type_id === roomType.id);
                    
                    // Nếu có search filter ngày, rooms đã được filter sẵn từ API
                    // Nếu không có search filter, chỉ hiển thị phòng available
                    if (!appliedFilters || (!appliedFilters.checkIn && !appliedFilters.checkOut)) {
                        availableRooms = availableRooms.filter(r => r.status === 'available');
                    }

                    // Lọc theo số khách nếu có
                    if (appliedFilters?.guests) {
                        if ((roomType.max_occupancy || 0) < appliedFilters.guests) return null;
                    }

                    // Nếu có search filter mà không còn phòng trống -> ẩn type này
                    if (appliedFilters && availableRooms.length === 0) return null;

                    const imageUrl = getRoomImageUrl(roomType.name);
                    return `
                        <div class="room-card" onclick="viewRoomDetail(${roomType.id})">
                            <div class="room-image">
                                <img src="${imageUrl}" alt="${roomType.name}" class="room-img" loading="lazy" 
                                     onerror="this.onerror=null; this.src='${ROOM_IMAGES.default}';" />
                                <span class="rating-badge">5</span>
                            </div>
                            <div class="room-info">
                                <h3 class="room-name">${roomType.name}</h3>
                                <p class="room-type">${roomType.description || roomType.name} • Guests ${roomType.max_occupancy}</p>
                                <p class="room-type" style="margin-top: 0.5rem;">
                                    <i class="fas fa-check-circle" style="color: #10b981;"></i> 
                                    ${availableRooms.length} ${availableRooms.length === 1 ? 'room' : 'rooms'} available
                                    ${appliedFilters?.checkIn ? `<br/><small style="color: #6b7280;">${appliedFilters.checkIn} → ${appliedFilters.checkOut}</small>` : ''}
                                </p>
                                <div class="room-footer">
                                    <span class="room-price">${formatCurrency(roomType.price_per_night)} / night</span>
                                    <button class="btn btn-book" onclick="event.stopPropagation(); viewRoomDetail(${roomType.id})">
                                        Xem chi tiết
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                })
                .filter(Boolean);

            grid.innerHTML = cards.length
                ? cards.join('')
                : `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>No rooms match your search</h3>
                        <p>Try different dates or guest count.</p>
                    </div>
                `;
        }
    } catch (error) {
        console.error('Failed to load rooms:', error);
        showToast('Không thể tải danh sách phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Global variables for bookings
let allBookingsData = [];
let currentBookingFilter = 'all';

// Load my bookings
async function loadMyBookings() {
    if (!getToken()) {
        showToast('Vui lòng đăng nhập để xem bookings', 'warning');
        showLoginModal();
        return;
    }
    
    try {
        showLoading();
        
        // Get or create customer to get customer_id
        const customer = await getOrCreateCustomer();
        
        // Get bookings for this customer
        const bookings = await bookingAPI.getAll({ customer_id: customer.id });
        allBookingsData = bookings;
        
        const list = document.getElementById('myBookingsList');
        const noBookings = document.getElementById('noBookings');
        
        if (!list) {
            console.error('myBookingsList element not found');
            return;
        }
        
        // Update stats
        updateBookingStats(bookings);
        
        if (bookings.length === 0) {
            list.innerHTML = '';
            if (noBookings) noBookings.style.display = 'block';
            return;
        }
        
        if (noBookings) noBookings.style.display = 'none';
        
        // Get room info for each booking
        const bookingsWithRoomInfo = await Promise.all(bookings.map(async (booking) => {
            try {
                const room = await roomAPI.getRoomById(booking.room_id);
                const roomType = await roomAPI.getRoomTypes().then(types => 
                    types.find(t => t.id === room.room_type_id)
                ).catch(() => null);
                return { ...booking, room, roomType };
            } catch (error) {
                console.error(`Failed to load room ${booking.room_id}:`, error);
                return { ...booking, room: null, roomType: null };
            }
        }));
        
        // Render bookings
        renderBookings(bookingsWithRoomInfo);
        
    } catch (error) {
        console.error('Failed to load bookings:', error);
        showToast(error.message || 'Không thể tải danh sách đặt phòng', 'error');
        const list = document.getElementById('myBookingsList');
        if (list) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i> Lỗi khi tải danh sách đặt phòng</div>';
        }
    } finally {
        hideLoading();
    }
}

// Update booking stats
function updateBookingStats(bookings) {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    
    document.getElementById('totalBookings').textContent = total;
    document.getElementById('confirmedCount').textContent = confirmed;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('cancelledCount').textContent = cancelled;
    
    // Update tab counts
    document.getElementById('tabAllCount').textContent = total;
    document.getElementById('tabConfirmedCount').textContent = confirmed;
    document.getElementById('tabPendingCount').textContent = pending;
    document.getElementById('tabCancelledCount').textContent = cancelled;
}

// Render bookings
function renderBookings(bookings) {
    const list = document.getElementById('myBookingsList');
    if (!list) return;
    
    if (bookings.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> No bookings found</div>';
        return;
    }
    
    list.innerHTML = bookings.map(booking => {
        const roomInfo = booking.room 
            ? `Phòng ${booking.room.room_number || booking.room_id}${booking.roomType ? ` - ${booking.roomType.name}` : ''}`
            : `Phòng #${booking.room_id}`;
        const checkInDate = new Date(booking.check_in);
        const checkOutDate = new Date(booking.check_out);
        const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
        const totalAmount = booking.total_amount || 0;
        
        // Format dates
        const checkInStr = formatDate(booking.check_in);
        const checkOutStr = formatDate(booking.check_out);
        
        // Status actions
        let actions = '';
        if (booking.status === 'confirmed' || booking.status === 'pending') {
            actions = `
                <button class="btn-action btn-cancel" onclick="cancelBooking(${booking.id})" title="Cancel Booking">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `;
        }
        if (booking.status === 'checked_in') {
            actions = `
                <span class="status-info"><i class="fas fa-info-circle"></i> Currently checked in</span>
            `;
        }
        
        return `
            <div class="booking-card-modern">
                <div class="booking-card-header">
                    <div class="booking-id">
                        <i class="fas fa-hashtag"></i> Booking #${booking.id}
                    </div>
                    ${getStatusBadge(booking.status)}
                </div>
                <div class="booking-card-body">
                    <div class="booking-room-info">
                        <i class="fas fa-bed"></i>
                        <div>
                            <strong>${roomInfo}</strong>
                            ${booking.roomType ? `<span class="room-type-badge">${booking.roomType.name}</span>` : ''}
                        </div>
                    </div>
                    <div class="booking-dates">
                        <div class="date-item">
                            <i class="fas fa-calendar-check"></i>
                            <div>
                                <span class="date-label">Check-in</span>
                                <span class="date-value">${checkInStr}</span>
                            </div>
                        </div>
                        <div class="date-item">
                            <i class="fas fa-calendar-times"></i>
                            <div>
                                <span class="date-label">Check-out</span>
                                <span class="date-value">${checkOutStr}</span>
                            </div>
                        </div>
                    </div>
                    <div class="booking-details-row">
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>${booking.guests} Guest${booking.guests > 1 ? 's' : ''}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-moon"></i>
                            <span>${nights} Night${nights > 1 ? 's' : ''}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span class="booking-total">${formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                    ${booking.special_requests ? `
                        <div class="booking-requests">
                            <i class="fas fa-comment"></i>
                            <span>${booking.special_requests}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="booking-card-footer">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}

// Filter bookings
function filterBookings(status) {
    currentBookingFilter = status;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) {
            btn.classList.add('active');
        }
    });
    
    // Filter bookings
    let filtered = allBookingsData;
    if (status !== 'all') {
        filtered = allBookingsData.filter(b => b.status === status);
    }
    
    // Re-render with room info
    Promise.all(filtered.map(async (booking) => {
        try {
            const room = await roomAPI.getRoomById(booking.room_id);
            const roomType = await roomAPI.getRoomTypes().then(types => 
                types.find(t => t.id === room.room_type_id)
            ).catch(() => null);
            return { ...booking, room, roomType };
        } catch (error) {
            return { ...booking, room: null, roomType: null };
        }
    })).then(bookingsWithRoomInfo => {
        renderBookings(bookingsWithRoomInfo);
    });
}

// Load profile data
async function loadProfileData() {
    if (!getToken()) {
        showToast('Vui lòng đăng nhập để xem profile', 'warning');
        showLoginModal();
        return;
    }
    
    try {
        showLoading();
        
        // Load user info
        if (!window.currentUser) {
            window.currentUser = await authAPI.getMe();
        }
        
        // Update sidebar
        document.getElementById('sidebarName').textContent = window.currentUser.full_name || window.currentUser.username || 'User';
        document.getElementById('sidebarEmail').textContent = window.currentUser.email || '';
        
        // Update form fields
        document.getElementById('fullName').value = window.currentUser.full_name || '';
        document.getElementById('email').value = window.currentUser.email || '';
        document.getElementById('username').value = window.currentUser.username || '';
        
        // Load customer info (phone, address)
        try {
            const customer = await getOrCreateCustomer();
            if (customer) {
                document.getElementById('phone').value = customer.phone || '';
                document.getElementById('address').value = customer.address || '';
                // Store customer ID for updates
                window.currentCustomer = customer;
            }
        } catch (error) {
            console.error('Failed to load customer info:', error);
            // Set defaults if customer doesn't exist
            document.getElementById('phone').value = '';
            document.getElementById('address').value = '';
        }
        
        // Member since
        if (window.currentUser.created_at) {
            const date = new Date(window.currentUser.created_at);
            const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            document.getElementById('statMemberSince').textContent = monthYear;
        }
        
        // Load booking stats
        try {
            const customer = await getOrCreateCustomer();
            const bookings = await bookingAPI.getAll({ customer_id: customer.id });
            document.getElementById('statTotalBookings').textContent = bookings.length;
            const active = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length;
            document.getElementById('statActiveReservations').textContent = active;
        } catch (error) {
            console.error('Failed to load booking stats:', error);
        }
        
    } catch (error) {
        console.error('Failed to load profile:', error);
        showToast(error.message || 'Không thể tải thông tin profile', 'error');
    } finally {
        hideLoading();
    }
}

// Show profile section
function showProfileSection(section) {
    // Hide all sections
    document.querySelectorAll('.profile-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(section + 'Section');
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Update menu items
    document.querySelectorAll('.profile-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
}

// Toggle edit personal info
function toggleEditPersonal() {
    const inputs = document.querySelectorAll('#personalForm input');
    const isDisabled = inputs[0].disabled;
    
    // Allow editing: fullName, email, phone, address
    // Don't allow: username (unique constraint)
    inputs.forEach(input => {
        if (input.id !== 'username') {
            input.disabled = !isDisabled;
        }
    });
    
    const btnSave = document.getElementById('btnSavePersonal');
    const btnEdit = document.getElementById('btnEditPersonal');
    
    if (isDisabled) {
        // Enable edit mode
        btnSave.style.display = 'block';
        btnEdit.innerHTML = '<i class="fas fa-times"></i> Cancel';
        btnEdit.classList.add('cancel-mode');
    } else {
        // Cancel edit mode - reset form
        btnSave.style.display = 'none';
        btnEdit.innerHTML = '<i class="fas fa-edit"></i> Edit Profile';
        btnEdit.classList.remove('cancel-mode');
        
        // Reset form to original values
        if (window.currentUser) {
            document.getElementById('fullName').value = window.currentUser.full_name || '';
            document.getElementById('email').value = window.currentUser.email || '';
        }
        if (window.currentCustomer) {
            document.getElementById('phone').value = window.currentCustomer.phone || '';
            document.getElementById('address').value = window.currentCustomer.address || '';
        } else {
            document.getElementById('phone').value = '';
            document.getElementById('address').value = '';
        }
    }
}

// Save personal info
async function savePersonalInfo() {
    try {
        showLoading();
        
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address').value.trim();
        
        // Validation
        if (!fullName) {
            showToast('Vui lòng nhập họ và tên', 'error');
            return;
        }
        
        if (!email) {
            showToast('Vui lòng nhập email', 'error');
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Email không hợp lệ', 'error');
            return;
        }
        
        // Update user info (Auth service)
        const userUpdateData = {
            full_name: fullName,
            email: email
        };
        
        await authAPI.updateMe(userUpdateData);
        
        // Update customer info (Customer service)
        try {
            let customer = window.currentCustomer;
            if (!customer) {
                // Create customer if doesn't exist
                customer = await getOrCreateCustomer();
            }
            
            if (customer && customer.id) {
                const customerUpdateData = {
                    name: fullName, // Sync name with full_name
                    email: email,   // Sync email
                    phone: phone || '0000000000',
                    address: address || ''
                };
                
                await customerAPI.update(customer.id, customerUpdateData);
                
                // Update local customer data
                window.currentCustomer = { ...customer, ...customerUpdateData };
            }
        } catch (error) {
            console.error('Failed to update customer info:', error);
            // Don't fail the whole update if customer update fails
            showToast('Cập nhật thông tin user thành công, nhưng có lỗi khi cập nhật thông tin customer', 'warning');
        }
        
        // Update local user data
        window.currentUser = { ...window.currentUser, ...userUpdateData };
        
        // Update sidebar
        document.getElementById('sidebarName').textContent = fullName || window.currentUser.username;
        document.getElementById('sidebarEmail').textContent = email;
        
        // Show success message
        const successMsg = document.getElementById('personalSuccess');
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
        
        // Disable edit mode
        toggleEditPersonal();
        
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Failed to update profile:', error);
        let errorMsg = error.message || 'Không thể cập nhật profile';
        if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
            errorMsg = 'Email đã được sử dụng bởi tài khoản khác';
        }
        showToast(errorMsg, 'error');
    } finally {
        hideLoading();
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Vui lòng điền đầy đủ thông tin', 'warning');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Mật khẩu mới không khớp', 'warning');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        // Call change password API
        await apiRequest(`${API_CONFIG.AUTH}/change-password`, {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        // Show success message
        const successMsg = document.getElementById('passwordSuccess');
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
        
        // Clear form
        document.getElementById('passwordForm').reset();
        
        showToast('Password changed successfully!', 'success');
    } catch (error) {
        console.error('Failed to change password:', error);
        let errorMsg = error.message || 'Không thể đổi mật khẩu';
        if (errorMsg.includes('incorrect')) {
            errorMsg = 'Mật khẩu hiện tại không đúng';
        }
        showToast(errorMsg, 'error');
    } finally {
        hideLoading();
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (!await confirmAction('Bạn có chắc chắn muốn hủy đặt phòng này?', 'Hủy đặt phòng')) {
        return;
    }
    
    try {
        showLoading();
        await bookingAPI.cancel(bookingId);
        showToast('Đã hủy đặt phòng thành công', 'success');
        loadMyBookings();
    } catch (error) {
        console.error('Failed to cancel booking:', error);
        showToast(error.message || 'Không thể hủy đặt phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Get or create customer from current user
async function getOrCreateCustomer() {
    if (!getToken()) {
        throw new Error('Vui lòng đăng nhập trước');
    }
    
    if (!window.currentUser) {
        // Load user info if not available
        try {
            window.currentUser = await authAPI.getMe();
        } catch (error) {
            console.error('Failed to load user info:', error);
            throw new Error('Không thể tải thông tin người dùng');
        }
    }
    
    if (!window.currentUser) {
        throw new Error('Thông tin người dùng không khả dụng');
    }
    
    const userEmail = window.currentUser.email;
    const userName = window.currentUser.full_name || window.currentUser.username;
    
    try {
        // Try to find customer by email
        // Note: customerAPI.getAll() might require search parameter
        let customers = [];
        try {
            customers = await customerAPI.getAll();
        } catch (error) {
            // If getAll fails, try with search parameter
            console.warn('getAll failed, trying with search:', error);
            try {
                customers = await customerAPI.getAll({ search: userEmail });
            } catch (e) {
                console.error('Failed to get customers:', e);
            }
        }
        
        // Search for existing customer by email
        const existingCustomer = Array.isArray(customers) 
            ? customers.find(c => c.email && c.email.toLowerCase() === userEmail.toLowerCase())
            : null;
        
        if (existingCustomer) {
            console.log('Found existing customer:', existingCustomer);
            return existingCustomer;
        }
        
        // Create new customer if not exists
        console.log('Creating new customer for:', userEmail);
        const customerData = {
            name: userName,
            email: userEmail,
            phone: '0000000000', // Default phone, user can update later
            address: ''
        };
        
        const newCustomer = await customerAPI.create(customerData);
        console.log('Created new customer:', newCustomer);
        return newCustomer;
    } catch (error) {
        console.error('Error getting/creating customer:', error);
        
        // If create fails because customer exists, try to find again
        if (error.message && error.message.includes('already exists')) {
            try {
                const customers = await customerAPI.getAll();
                const found = Array.isArray(customers) 
                    ? customers.find(c => c.email && c.email.toLowerCase() === userEmail.toLowerCase())
                    : null;
                if (found) {
                    console.log('Found customer after create error:', found);
                    return found;
                }
            } catch (e) {
                console.error('Failed to search customers after create error:', e);
            }
        }
        
        throw new Error('Không thể lấy thông tin khách hàng. Vui lòng thử lại.');
    }
}

// Book room type
async function bookRoomType(roomTypeId) {
    if (!getToken()) {
        showToast('Vui lòng đăng nhập để đặt phòng', 'warning');
        showLoginModal();
        return;
    }
    
    try {
        showLoading();
        
        // Get room type info
        const roomTypes = await roomAPI.getRoomTypes();
        const roomType = roomTypes.find(t => t.id === roomTypeId);
        
        if (!roomType) {
            showToast('Không tìm thấy loại phòng', 'error');
            return;
        }
        
        // Get available rooms for this type
        const rooms = await roomAPI.getRooms({ room_type_id: roomTypeId, status: 'available' });
        
        if (rooms.length === 0) {
            showToast('Không còn phòng trống cho loại này', 'warning');
            return;
        }
        
        // Get dates from search form or use defaults
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const checkIn = document.getElementById('searchCheckIn')?.value || today;
        const checkOut = document.getElementById('searchCheckOut')?.value || tomorrow;
        const guests = parseInt(document.getElementById('searchGuests')?.value || roomType.max_occupancy || 2);
        
        // Validate guests
        const maxGuests = roomType.max_occupancy || 4;
        const finalGuests = Math.min(Math.max(guests, 1), maxGuests);
        
        showBookingModalForUser(roomTypeId, rooms[0].id, roomType, checkIn, checkOut, finalGuests);
    } catch (error) {
        console.error('Error in bookRoomType:', error);
        showToast(error.message || 'Không thể tải thông tin phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Show booking modal for user
function showBookingModalForUser(roomTypeId, roomId, roomType, checkIn, checkOut, guests) {
    const modal = document.getElementById('bookingModal');
    const body = document.getElementById('bookingModalBody');
    
    // Calculate nights and total price
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
    const pricePerNight = roomType.price_per_night || 0;
    const totalPrice = nights * pricePerNight;
    
    body.innerHTML = `
        <h2><i class="fas fa-calendar-check"></i> Đặt Phòng</h2>
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f0f9ff; border-radius: 8px;">
            <h3 style="margin: 0 0 0.5rem 0; color: #2563eb;">${roomType.name}</h3>
            <p style="margin: 0.25rem 0; color: #64748b;">
                <i class="fas fa-users"></i> Tối đa ${roomType.max_occupancy} khách
            </p>
            <p style="margin: 0.25rem 0; color: #64748b;">
                <i class="fas fa-dollar-sign"></i> ${formatCurrency(pricePerNight)} / đêm
            </p>
        </div>
        <form id="userBookingForm">
            <div class="form-group">
                <label>Ngày Check-in *</label>
                <input type="date" id="userBookingCheckIn" class="form-control" 
                    value="${checkIn}" required min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Ngày Check-out *</label>
                <input type="date" id="userBookingCheckOut" class="form-control" 
                    value="${checkOut}" required min="${checkIn}">
            </div>
            <div class="form-group">
                <label>Số lượng khách *</label>
                <input type="number" id="userBookingGuests" class="form-control" 
                    value="${guests}" required min="1" max="${roomType.max_occupancy}">
                <small style="color: #64748b;">Tối đa ${roomType.max_occupancy} khách</small>
            </div>
            <div class="form-group">
                <label>Yêu cầu đặc biệt</label>
                <textarea id="userBookingRequests" class="form-control" rows="3" 
                    placeholder="Nhập yêu cầu đặc biệt (nếu có)..."></textarea>
            </div>
            <div style="padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Số đêm:</span>
                    <strong id="bookingNights">${nights}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Giá / đêm:</span>
                    <strong>${formatCurrency(pricePerNight)}</strong>
                </div>
                <hr style="margin: 0.5rem 0;">
                <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; color: #2563eb;">
                    <span>Tổng tiền:</span>
                    <strong id="bookingTotal">${formatCurrency(totalPrice)}</strong>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeBookingModal()">Hủy</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-check"></i> Xác nhận đặt phòng
                </button>
            </div>
        </form>
    `;
    
    modal.style.display = 'flex';
    
    // Add event listeners for date changes to recalculate price
    const checkInInput = document.getElementById('userBookingCheckIn');
    const checkOutInput = document.getElementById('userBookingCheckOut');
    const guestsInput = document.getElementById('userBookingGuests');
    
    const updatePrice = () => {
        const newCheckIn = new Date(checkInInput.value);
        const newCheckOut = new Date(checkOutInput.value);
        if (newCheckOut > newCheckIn) {
            const newNights = Math.ceil((newCheckOut - newCheckIn) / (1000 * 60 * 60 * 24));
            const newTotal = newNights * pricePerNight;
            document.getElementById('bookingNights').textContent = newNights;
            document.getElementById('bookingTotal').textContent = formatCurrency(newTotal);
        }
    };
    
    checkInInput.addEventListener('change', () => {
        checkOutInput.min = checkInInput.value;
        if (checkOutInput.value < checkInInput.value) {
            const nextDay = new Date(checkInInput.value);
            nextDay.setDate(nextDay.getDate() + 1);
            checkOutInput.value = nextDay.toISOString().split('T')[0];
        }
        updatePrice();
    });
    
    checkOutInput.addEventListener('change', updatePrice);
    
    // Handle form submission
    document.getElementById('userBookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const checkInValue = checkInInput.value;
        const checkOutValue = checkOutInput.value;
        const guestsValue = parseInt(guestsInput.value);
        
        // Validation
        if (!checkInValue || !checkOutValue) {
            showToast('Vui lòng chọn ngày check-in và check-out', 'warning');
            return;
        }
        
        const checkInDate = new Date(checkInValue);
        const checkOutDate = new Date(checkOutValue);
        
        if (checkOutDate <= checkInDate) {
            showToast('Ngày check-out phải sau ngày check-in', 'warning');
            return;
        }
        
        if (guestsValue < 1 || guestsValue > roomType.max_occupancy) {
            showToast(`Số lượng khách phải từ 1 đến ${roomType.max_occupancy}`, 'warning');
            return;
        }
        
        try {
            showLoading();
            
            // Get or create customer
            const customer = await getOrCreateCustomer();
            
            const bookingData = {
                customer_id: customer.id,
                room_id: roomId,
                check_in: checkInValue,
                check_out: checkOutValue,
                guests: guestsValue,
                special_requests: document.getElementById('userBookingRequests').value || null
            };
            
            console.log('Creating booking:', bookingData);
            
            const booking = await bookingAPI.create(bookingData);
            showToast('Đặt phòng thành công!', 'success');
            closeBookingModal();
            
            // Reload bookings if on myBookings page
            if (document.getElementById('myBookingsPage')?.classList.contains('active')) {
                loadMyBookings();
            } else {
                // Switch to myBookings page
                showUserPage('myBookings');
            }
        } catch (error) {
            console.error('Booking error:', error);
            let errorMsg = error.message || 'Không thể đặt phòng';
            
            // Translate common errors
            if (errorMsg.includes('not available') || errorMsg.includes('Room is not available')) {
                errorMsg = 'Phòng không còn trống trong khoảng thời gian này. Vui lòng chọn ngày khác.';
            } else if (errorMsg.includes('Customer not found')) {
                errorMsg = 'Không tìm thấy thông tin khách hàng. Vui lòng thử lại.';
            } else if (errorMsg.includes('Room not found')) {
                errorMsg = 'Không tìm thấy thông tin phòng. Vui lòng thử lại.';
            }
            
            showToast(errorMsg, 'error');
        } finally {
            hideLoading();
        }
    });
}

// Search rooms
function searchRooms() {
    const checkIn = document.getElementById('searchCheckIn').value;
    const checkOut = document.getElementById('searchCheckOut').value;
    const guests = parseInt(document.getElementById('searchGuests').value || '1', 10);
    
    if (!checkIn || !checkOut) {
        showToast('Vui lòng chọn ngày check-in và check-out', 'warning');
        return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        showToast('Ngày check-out phải sau ngày check-in', 'warning');
        return;
    }

    searchFilters = { checkIn, checkOut, guests };
    
    showUserPage('rooms');
    loadAllRooms(searchFilters);
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear form
        const form = document.getElementById('userLoginForm');
        if (form) {
            form.reset();
        }
        // Clear error
        const errorEl = document.getElementById('userLoginError');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }
}

// Close login modal
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show register modal
function showRegisterModal() {
    closeLoginModal();
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear form
        const form = document.getElementById('userRegisterForm');
        if (form) {
            form.reset();
        }
        // Clear error
        const errorEl = document.getElementById('userRegisterError');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }
}

// Close register modal
function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close booking modal
function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

// Logout
function logout() {
    removeToken();
    window.currentUser = null;
    showUnauthenticatedUI();
    showToast('Đã đăng xuất', 'info');
    // Redirect to login page after logout
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 500); // Small delay to show toast message
}

// View room detail
function viewRoomDetail(roomTypeId) {
    window.location.href = `/user/room-detail.html?type_id=${roomTypeId}`;
}

// Export
window.showUserPage = showUserPage;
window.bookRoomType = bookRoomType;
window.viewRoomDetail = viewRoomDetail;
window.searchRooms = searchRooms;
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.closeBookingModal = closeBookingModal;
window.cancelBooking = cancelBooking;
window.getOrCreateCustomer = getOrCreateCustomer;
window.filterBookings = filterBookings;
window.showProfileSection = showProfileSection;
window.toggleEditPersonal = toggleEditPersonal;
window.savePersonalInfo = savePersonalInfo;
window.changePassword = changePassword;
window.loadProfileData = loadProfileData;

