// User interface functionality

// Use window.currentUser as global variable to avoid conflicts
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}
let featuredRooms = [];

// Initialize user interface
document.addEventListener('DOMContentLoaded', () => {
    checkUserAuth();
    loadFeaturedRooms();
    setupEventListeners();
});

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
            const page = item.dataset.page;
            if (page) {
                showUserPage(page);
            }
        });
    });
    
    // Login button
    document.getElementById('userLoginBtn').addEventListener('click', () => {
        showLoginModal();
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
    
    const pageElement = document.getElementById(`${pageName}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
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
            loadAllRooms();
            break;
        case 'myBookings':
            loadMyBookings();
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
                return `
                    <div class="room-card" onclick="bookRoomType(${roomType.id})">
                        <div class="room-image">
                            <div class="image-placeholder">
                                <i class="fas fa-bed"></i>
                                <span class="rating-badge">5</span>
                            </div>
                        </div>
                        <div class="room-info">
                            <h3 class="room-name">${roomType.name}</h3>
                            <p class="room-type">${roomType.name} • Guests ${roomType.max_occupancy}</p>
                            <div class="room-footer">
                                <span class="room-price">${formatCurrency(roomType.price_per_night)} / night</span>
                                <button class="btn btn-book" onclick="event.stopPropagation(); bookRoomType(${roomType.id})">
                                    Book Now
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

// Load all rooms
async function loadAllRooms() {
    try {
        showLoading();
        const roomTypes = await roomAPI.getRoomTypes();
        const rooms = await roomAPI.getRooms();
        
        const grid = document.getElementById('roomsGrid');
        if (grid) {
            grid.innerHTML = roomTypes.map(roomType => {
                const availableRooms = rooms.filter(r => r.room_type_id === roomType.id && r.status === 'available');
                return `
                    <div class="room-card" onclick="bookRoomType(${roomType.id})">
                        <div class="room-image">
                            <div class="image-placeholder">
                                <i class="fas fa-bed"></i>
                                <span class="rating-badge">5</span>
                            </div>
                        </div>
                        <div class="room-info">
                            <h3 class="room-name">${roomType.name}</h3>
                            <p class="room-type">${roomType.description || roomType.name} • Guests ${roomType.max_occupancy}</p>
                            <p class="room-type" style="margin-top: 0.5rem;">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i> 
                                ${availableRooms.length} rooms available
                            </p>
                            <div class="room-footer">
                                <span class="room-price">${formatCurrency(roomType.price_per_night)} / night</span>
                                <button class="btn btn-book" onclick="event.stopPropagation(); bookRoomType(${roomType.id})">
                                    Book Now
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load rooms:', error);
        showToast('Không thể tải danh sách phòng', 'error');
    } finally {
        hideLoading();
    }
}

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
        
        const list = document.getElementById('myBookingsList');
        if (!list) {
            console.error('myBookingsList element not found');
            return;
        }
        
        if (bookings.length === 0) {
            list.innerHTML = '<div class="empty-state">Bạn chưa có đặt phòng nào</div>';
            return;
        }
        
        // Get room info for each booking
        const bookingsWithRoomInfo = await Promise.all(bookings.map(async (booking) => {
            try {
                const room = await roomAPI.getRoomById(booking.room_id);
                return { ...booking, room };
            } catch (error) {
                console.error(`Failed to load room ${booking.room_id}:`, error);
                return { ...booking, room: null };
            }
        }));
        
        list.innerHTML = bookingsWithRoomInfo.map(booking => {
            const roomInfo = booking.room ? `Phòng ${booking.room.room_number || booking.room_id}` : `Phòng #${booking.room_id}`;
            const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="booking-card">
                    <div class="booking-info">
                        <div class="booking-title">Đặt phòng #${booking.id}</div>
                        <div class="booking-details">
                            <i class="fas fa-bed"></i> ${roomInfo}<br>
                            <i class="fas fa-calendar"></i> ${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}<br>
                            <i class="fas fa-users"></i> ${booking.guests} khách • ${nights} đêm<br>
                            <i class="fas fa-dollar-sign"></i> ${formatCurrency(booking.total_amount || 0)}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        ${getStatusBadge(booking.status)}
                        ${booking.status === 'confirmed' ? `
                            <button class="btn btn-sm btn-secondary" onclick="cancelBooking(${booking.id})">
                                <i class="fas fa-times"></i> Hủy
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load bookings:', error);
        showToast(error.message || 'Không thể tải danh sách đặt phòng', 'error');
        const list = document.getElementById('myBookingsList');
        if (list) {
            list.innerHTML = '<div class="empty-state">Lỗi khi tải danh sách đặt phòng</div>';
        }
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
    const guests = document.getElementById('searchGuests').value;
    
    if (!checkIn || !checkOut) {
        showToast('Vui lòng chọn ngày check-in và check-out', 'warning');
        return;
    }
    
    showUserPage('rooms');
    // Filter rooms based on search criteria
    loadAllRooms();
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
    showUserPage('home');
}

// Export
window.showUserPage = showUserPage;
window.bookRoomType = bookRoomType;
window.searchRooms = searchRooms;
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.closeBookingModal = closeBookingModal;
window.cancelBooking = cancelBooking;
window.getOrCreateCustomer = getOrCreateCustomer;

