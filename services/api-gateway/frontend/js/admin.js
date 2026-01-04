// Admin Dashboard functionality

// Use window.currentUser as global variable to avoid conflicts
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}

// Show admin page
function showAdminPage(pageName) {
    document.querySelectorAll('.admin-page').forEach(page => {
        page.classList.remove('active');
    });
    
    const pageElement = document.getElementById(`admin${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Update sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });
    
    // Load page data
    loadAdminPageData(pageName);
}

// Load admin page data
function loadAdminPageData(pageName) {
    switch(pageName) {
        case 'dashboard':
            loadAdminDashboard();
            break;
        case 'rooms':
            loadRoomTypes();
            loadRooms();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('No token found, redirecting to login');
            window.location.href = 'user.html#login';
            return;
        }
        
        showLoading();
        const [rooms, bookings, payments, customers] = await Promise.all([
            roomAPI.getRooms().catch((err) => {
                console.error('Failed to load rooms:', err);
                return [];
            }),
            bookingAPI.getAll().catch((err) => {
                console.error('Failed to load bookings:', err);
                return [];
            }),
            paymentAPI.getAll({ payment_status: 'completed' }).catch((err) => {
                console.error('Failed to load payments:', err);
                return [];
            }),
            customerAPI.getAll().catch((err) => {
                console.error('Failed to load customers:', err);
                return [];
            })
        ]);
        
        // Check if any critical errors occurred
        const hasAuthError = [rooms, bookings, payments, customers].some(
            result => result === null || (Array.isArray(result) && result.length === 0 && result.error)
        );
        
        if (hasAuthError) {
            // Check if it's an authentication issue
            const tokenCheck = getToken();
            if (!tokenCheck) {
                showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                removeToken();
                setTimeout(() => {
                    window.location.href = 'user.html#login';
                }, 2000);
                return;
            }
        }
        
        // Calculate metrics
        const totalRooms = rooms.length;
        const availableRooms = rooms.filter(r => r.status === 'available').length;
        const roomsAvailablePercent = totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0;
        
        const currentBookings = bookings.filter(b => 
            b.status === 'confirmed' || b.status === 'checked_in'
        ).length;
        
        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Today's activity (mock data for now)
        const todayCheckIns = bookings.filter(b => {
            const checkIn = new Date(b.check_in);
            const today = new Date();
            return checkIn.toDateString() === today.toDateString() && b.status === 'checked_in';
        }).length;
        
        const todayCheckOuts = bookings.filter(b => {
            const checkOut = new Date(b.check_out);
            const today = new Date();
            return checkOut.toDateString() === today.toDateString() && b.status === 'checked_out';
        }).length;
        
        // Update UI
        document.getElementById('roomsAvailablePercent').textContent = `${roomsAvailablePercent}%`;
        document.querySelector('.progress-fill').style.width = `${roomsAvailablePercent}%`;
        
        document.getElementById('currentBookings').textContent = currentBookings;
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('todayActivity').textContent = `Check-ins ${todayCheckIns} • Check-outs ${todayCheckOuts}`;
        
        // Load recent bookings
        loadRecentBookings(bookings.slice(0, 5));
        
        // Load room status overview
        loadRoomStatusOverview(rooms);
        
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
        showToast('Không thể tải dashboard', 'error');
    } finally {
        hideLoading();
    }
}

// Load recent bookings
async function loadRecentBookings(bookings) {
    const list = document.getElementById('recentBookingsList');
    
    if (bookings.length === 0) {
        list.innerHTML = '<div class="empty-state">No recent bookings</div>';
        return;
    }
    
    // Get customer names (simplified - in real app, fetch from API)
    const html = await Promise.all(bookings.map(async (booking) => {
        let customerName = `Customer #${booking.customer_id}`;
        try {
            const customer = await customerAPI.getById(booking.customer_id);
            customerName = customer.name;
        } catch (e) {
            // Use default
        }
        
        let roomNumber = `Room #${booking.room_id}`;
        try {
            const room = await roomAPI.getRoomById(booking.room_id);
            roomNumber = room.room_number;
        } catch (e) {
            // Use default
        }
        
        return `
            <div class="booking-item">
                <div class="booking-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="booking-info">
                    <div class="booking-name">${customerName}</div>
                    <div class="booking-room">${roomNumber}</div>
                </div>
                <div class="booking-meta">
                    <div class="booking-date">${formatDate(booking.check_in)}</div>
                    ${getStatusBadge(booking.status)}
                </div>
            </div>
        `;
    }));
    
    list.innerHTML = html.join('');
}

// Load room status overview
function loadRoomStatusOverview(rooms) {
    const grid = document.getElementById('roomStatusOverview');
    
    const statusCounts = {
        available: rooms.filter(r => r.status === 'available').length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
        maintenance: rooms.filter(r => r.status === 'maintenance').length,
        booked: rooms.filter(r => r.status === 'booked').length
    };
    
    grid.innerHTML = `
        <div class="room-status-item available">
            <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">${statusCounts.available}</div>
            <div style="color: #6b7280; font-size: 0.875rem;">Available</div>
        </div>
        <div class="room-status-item occupied">
            <div style="font-size: 1.5rem; font-weight: 700; color: #ef4444;">${statusCounts.occupied}</div>
            <div style="color: #6b7280; font-size: 0.875rem;">Occupied</div>
        </div>
        <div class="room-status-item maintenance">
            <div style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">${statusCounts.maintenance}</div>
            <div style="color: #6b7280; font-size: 0.875rem;">Maintenance</div>
        </div>
        <div class="room-status-item booked">
            <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">${statusCounts.booked}</div>
            <div style="color: #6b7280; font-size: 0.875rem;">Booked</div>
        </div>
    `;
}

// Check in guest
function checkInGuest() {
    if (typeof showBookingModal === 'function') {
        showBookingModal();
    } else {
        showAdminPage('bookings');
    }
    // In real app, filter to show only pending bookings
}

// Generate invoice
function generateInvoice() {
    showAdminPage('bookings');
    showToast('Chọn booking để tạo invoice', 'info');
}

// Sidebar navigation
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page && getToken()) {
                showAdminPage(page);
            }
        });
    });
    
    // Check if user is admin and show admin layout
    checkAdminAccess();
});

// Check admin access
async function checkAdminAccess() {
    const token = getToken();
    console.log('checkAdminAccess - Token exists:', !!token);
    console.log('checkAdminAccess - Token value:', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
        console.error('No token found, redirecting to login');
        // Chưa đăng nhập → redirect về login.html
        window.location.href = '/login.html';
        return;
    }
    
    // Check roles from JWT token (already normalized in getUserRoles)
    const roles = getUserRoles();
    console.log('checkAdminAccess - User roles:', roles);
    
    // Check admin roles using helper function (consistent check)
    const isAdmin = typeof checkIsAdmin !== 'undefined' 
        ? checkIsAdmin(roles) 
        : roles.some(role => ['admin', 'manager', 'receptionist'].includes(role));
    console.log('checkAdminAccess - Is admin?', isAdmin, 'roles:', roles);
    
    if (!isAdmin) {
        console.warn('User is not admin, redirecting to user page');
        // Không phải admin → redirect về user/user.html#home
        window.location.href = '/user/user.html#home';
        return;
    }
    
    try {
        console.log('Calling authAPI.getMe()...');
        const user = await authAPI.getMe();
        console.log('authAPI.getMe() success:', user);
        window.currentUser = user;
        // Load dashboard
        loadAdminDashboard();
    } catch (error) {
        console.error('Failed to load user info:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        // Token có thể hết hạn → redirect về login
        if (error.status === 401 || error.status === 403 || 
            (error.message && (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('403')))) {
            console.error('Authentication failed, removing token and redirecting to login');
            removeToken();
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
            return;
        }
        // Still allow access if token is valid (roles are in JWT)
        // Just log the error but continue
        console.warn('Could not load user info, but token is valid. Continuing...');
        loadAdminDashboard();
    }
}

// Initialize admin page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check admin access when admin.html loads
        if (window.location.pathname.includes('admin.html')) {
            console.log('Admin.js: Admin page loaded, checking access...');
            checkAdminAccess();
        }
    });
} else {
    // DOM already loaded
    if (window.location.pathname.includes('admin.html')) {
        console.log('Admin.js: Admin page already loaded, checking access...');
        checkAdminAccess();
    }
}

// Export
window.showAdminPage = showAdminPage;
window.checkInGuest = checkInGuest;
window.generateInvoice = generateInvoice;

