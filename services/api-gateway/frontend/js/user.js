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
            window.currentUser = await authAPI.getMe();
            showAuthenticatedUI();
        } catch (error) {
            console.error('Failed to load user info:', error);
            removeToken();
        }
    } else {
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
                setToken(response.access_token);
                showToast('Đăng nhập thành công', 'success');
                closeLoginModal();
                checkUserAuth();
                
                // Check if admin, redirect to admin page
                const userRoles = response.user?.roles?.map(r => r.name) || getUserRoles();
                
                // Sử dụng router để điều hướng
                if (typeof router !== 'undefined' && router.onLoginSuccess) {
                    router.onLoginSuccess(userRoles);
                } else {
                    // Fallback
                    if (userRoles.includes('admin') || userRoles.includes('manager') || userRoles.includes('receptionist')) {
                        window.location.href = 'admin.html#dashboard';
                    } else {
                        window.location.href = 'user.html#home';
                    }
                }
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
                const userRoles = response.user?.roles?.map(r => r.name) || getUserRoles();
                
                // Sử dụng router để điều hướng
                if (typeof router !== 'undefined' && router.onRegisterSuccess) {
                    router.onRegisterSuccess(userRoles);
                } else {
                    // Fallback
                    if (userRoles.includes('admin') || userRoles.includes('manager') || userRoles.includes('receptionist')) {
                        window.location.href = 'admin.html#dashboard';
                    } else {
                        window.location.href = 'user.html#home';
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
        const bookings = await bookingAPI.getAll();
        // Filter bookings for current user (in real app, API should filter by user)
        
        const list = document.getElementById('myBookingsList');
        if (bookings.length === 0) {
            list.innerHTML = '<div class="empty-state">You have no bookings yet</div>';
            return;
        }
        
        list.innerHTML = bookings.map(booking => `
            <div class="booking-card">
                <div class="booking-info">
                    <div class="booking-title">Booking #${booking.id}</div>
                    <div class="booking-details">
                        Room #${booking.room_id} • ${formatDate(booking.check_in)} - ${formatDate(booking.check_out)} • 
                        ${booking.guests} guests
                    </div>
                </div>
                <div>
                    ${getStatusBadge(booking.status)}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load bookings:', error);
        showToast('Không thể tải bookings', 'error');
    } finally {
        hideLoading();
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
        // Get available rooms for this type
        const rooms = await roomAPI.getRooms({ room_type_id: roomTypeId, status: 'available' });
        const roomType = await roomAPI.getRoomTypes().then(types => types.find(t => t.id === roomTypeId));
        
        if (rooms.length === 0) {
            showToast('Không còn phòng trống cho loại này', 'warning');
            return;
        }
        
        // Show booking modal
        const checkIn = document.getElementById('searchCheckIn')?.value || '';
        const checkOut = document.getElementById('searchCheckOut')?.value || '';
        const guests = parseInt(document.getElementById('searchGuests')?.value || roomType.max_occupancy);
        
        showBookingModalForUser(roomTypeId, rooms[0].id, checkIn, checkOut, guests);
    } catch (error) {
        showToast('Không thể tải thông tin phòng', 'error');
    }
}

// Show booking modal for user
function showBookingModalForUser(roomTypeId, roomId, checkIn, checkOut, guests) {
    const modal = document.getElementById('bookingModal');
    const body = document.getElementById('bookingModalBody');
    
    body.innerHTML = `
        <h2><i class="fas fa-calendar-check"></i> Book Room</h2>
        <form id="userBookingForm">
            <div class="form-group">
                <label>Check-in Date *</label>
                <input type="date" id="userBookingCheckIn" class="form-control" 
                    value="${checkIn}" required>
            </div>
            <div class="form-group">
                <label>Check-out Date *</label>
                <input type="date" id="userBookingCheckOut" class="form-control" 
                    value="${checkOut}" required>
            </div>
            <div class="form-group">
                <label>Number of Guests *</label>
                <input type="number" id="userBookingGuests" class="form-control" 
                    value="${guests}" required min="1">
            </div>
            <div class="form-group">
                <label>Special Requests</label>
                <textarea id="userBookingRequests" class="form-control" rows="3"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeBookingModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Confirm Booking</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'flex';
    
    document.getElementById('userBookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get customer ID (in real app, from current user)
        const customerId = window.currentUser?.id || 1;
        
        const bookingData = {
            customer_id: customerId,
            room_id: roomId,
            check_in: document.getElementById('userBookingCheckIn').value,
            check_out: document.getElementById('userBookingCheckOut').value,
            guests: parseInt(document.getElementById('userBookingGuests').value),
            special_requests: document.getElementById('userBookingRequests').value || null
        };
        
        try {
            showLoading();
            await bookingAPI.create(bookingData);
            showToast('Đặt phòng thành công', 'success');
            closeBookingModal();
            loadMyBookings();
        } catch (error) {
            showToast(error.message || 'Không thể đặt phòng', 'error');
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

