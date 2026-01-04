// Bookings management

let bookings = [];
let filteredBookings = [];

// Load bookings
async function loadBookings() {
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('No token found, redirecting to login');
            window.location.href = 'user.html#login';
            return;
        }
        
        showLoading();
        bookings = await bookingAPI.getAll();
        filteredBookings = [...bookings];
        renderBookingsTable();
        setupBookingSearch();
    } catch (error) {
        console.error('Failed to load bookings:', error);
        
        // Check if it's an authentication error
        if (error.status === 401 || error.status === 403 || error.message?.includes('Unauthorized')) {
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            removeToken();
            setTimeout(() => {
                window.location.href = 'user.html#login';
            }, 2000);
        } else {
            showToast(error.message || 'Không thể tải danh sách đặt phòng', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Setup search and filter
function setupBookingSearch() {
    const searchInput = document.getElementById('bookingSearch');
    const statusFilter = document.getElementById('bookingStatusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyBookingFilters();
        }, 300));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            applyBookingFilters();
        });
    }
}

function applyBookingFilters() {
    const searchTerm = document.getElementById('bookingSearch')?.value.toLowerCase().trim() || '';
    const statusFilter = document.getElementById('bookingStatusFilter')?.value || '';
    
    filteredBookings = bookings.filter(booking => {
        const matchSearch = !searchTerm || 
            booking.id.toString().includes(searchTerm) ||
            booking.customer_id.toString().includes(searchTerm) ||
            booking.room_id.toString().includes(searchTerm);
        const matchStatus = !statusFilter || booking.status === statusFilter;
        return matchSearch && matchStatus;
    });
    
    renderBookingsTable();
}

// Render bookings table
function renderBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');
    
    if (filteredBookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <h3>${bookings.length === 0 ? 'Chưa có đặt phòng nào' : 'Không tìm thấy kết quả'}</h3>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredBookings.map(booking => `
        <tr class="fade-in">
            <td><strong>#${booking.id}</strong></td>
            <td>#${booking.customer_id}</td>
            <td>#${booking.room_id}</td>
            <td>${formatDate(booking.check_in)}</td>
            <td>${formatDate(booking.check_out)}</td>
            <td>${booking.guests} người</td>
            <td>${getStatusBadge(booking.status)}</td>
            <td><strong>${formatCurrency(booking.total_amount)}</strong></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="viewBookingDetails(${booking.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${booking.status !== 'cancelled' && booking.status !== 'completed' ? `
                        <button class="btn btn-danger btn-sm" onclick="cancelBooking(${booking.id})" title="Hủy đặt phòng">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// View booking details
async function viewBookingDetails(id) {
    try {
        showLoading();
        const booking = await bookingAPI.getById(id);
        
        const content = `
            <h2><i class="fas fa-calendar-check"></i> Chi Tiết Đặt Phòng</h2>
            <div class="detail-view">
                <div class="detail-item">
                    <div class="detail-label">Mã Đặt Phòng</div>
                    <div class="detail-value">#${booking.id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Khách Hàng</div>
                    <div class="detail-value">#${booking.customer_id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phòng</div>
                    <div class="detail-value">#${booking.room_id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Check-in</div>
                    <div class="detail-value">${formatDate(booking.check_in)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Check-out</div>
                    <div class="detail-value">${formatDate(booking.check_out)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Số Người</div>
                    <div class="detail-value">${booking.guests} người</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Trạng Thái</div>
                    <div class="detail-value">${getStatusBadge(booking.status)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Tổng Tiền</div>
                    <div class="detail-value">${formatCurrency(booking.total_amount)}</div>
                </div>
                ${booking.special_requests ? `
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <div class="detail-label">Yêu Cầu Đặc Biệt</div>
                        <div class="detail-value">${booking.special_requests}</div>
                    </div>
                ` : ''}
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeAllModals()">
                    <i class="fas fa-times"></i> Đóng
                </button>
            </div>
        `;
        
        showModal(content);
    } catch (error) {
        showToast('Không thể tải thông tin đặt phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Show booking modal
async function showBookingModal(bookingId = null) {
    // Load customers and rooms
    const [customers, rooms] = await Promise.all([
        customerAPI.getAll().catch(() => []),
        roomAPI.getRooms().catch(() => [])
    ]);
    
    const booking = bookingId ? bookings.find(b => b.id === bookingId) : null;
    
    const content = `
        <h2>${booking ? 'Sửa' : 'Tạo'} Đặt Phòng</h2>
        <form id="bookingForm">
            <div class="form-group">
                <label>Khách Hàng *</label>
                <select id="bookingCustomerId" class="form-control" required>
                    <option value="">Chọn khách hàng</option>
                    ${customers.map(c => `
                        <option value="${c.id}" ${booking && booking.customer_id === c.id ? 'selected' : ''}>
                            ${c.name} (${c.email})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Phòng *</label>
                <select id="bookingRoomId" class="form-control" required>
                    <option value="">Chọn phòng</option>
                    ${rooms.map(r => `
                        <option value="${r.id}" ${booking && booking.room_id === r.id ? 'selected' : ''}>
                            ${r.room_number} - ${getStatusBadge(r.status)}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Ngày Check-in *</label>
                <input type="date" id="bookingCheckIn" class="form-control" 
                    value="${booking ? booking.check_in : ''}" required>
            </div>
            <div class="form-group">
                <label>Ngày Check-out *</label>
                <input type="date" id="bookingCheckOut" class="form-control" 
                    value="${booking ? booking.check_out : ''}" required>
            </div>
            <div class="form-group">
                <label>Số Người *</label>
                <input type="number" id="bookingGuests" class="form-control" 
                    value="${booking ? booking.guests : 1}" required min="1">
            </div>
            <div class="form-group">
                <label>Yêu Cầu Đặc Biệt</label>
                <textarea id="bookingSpecialRequests" class="form-control" rows="3">${booking ? booking.special_requests || '' : ''}</textarea>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i> ${booking ? 'Cập Nhật' : 'Tạo Đặt Phòng'}
                </button>
            </div>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookingData = {
            customer_id: parseInt(document.getElementById('bookingCustomerId').value),
            room_id: parseInt(document.getElementById('bookingRoomId').value),
            check_in: document.getElementById('bookingCheckIn').value,
            check_out: document.getElementById('bookingCheckOut').value,
            guests: parseInt(document.getElementById('bookingGuests').value),
            special_requests: document.getElementById('bookingSpecialRequests').value
        };
        
        try {
            showLoading();
            if (booking) {
                await bookingAPI.update(booking.id, bookingData);
                showToast('Cập nhật đặt phòng thành công', 'success');
            } else {
                await bookingAPI.create(bookingData);
                showToast('Tạo đặt phòng thành công', 'success');
            }
            closeAllModals();
            loadBookings();
        } catch (error) {
            showToast(error.message || 'Không thể tạo đặt phòng', 'error');
        } finally {
            hideLoading();
        }
    });
}

// Cancel booking
async function cancelBooking(id) {
    const confirmed = await confirmAction(
        'Bạn có chắc chắn muốn hủy đặt phòng này?',
        'Xác nhận hủy đặt phòng'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading();
        await bookingAPI.cancel(id);
        showToast('Hủy đặt phòng thành công', 'success');
        loadBookings();
    } catch (error) {
        showToast(error.message || 'Không thể hủy đặt phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Export
window.loadBookings = loadBookings;
window.showBookingModal = showBookingModal;
window.cancelBooking = cancelBooking;
window.viewBookingDetails = viewBookingDetails;

