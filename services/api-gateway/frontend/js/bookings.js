// Bookings management

let bookings = [];
let filteredBookings = [];

// Load bookings
async function loadBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    
    // Show loading in table
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Đang tải dữ liệu...</td></tr>';
    }
    
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('No token found, redirecting to login');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">Vui lòng đăng nhập...</td></tr>';
            }
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
        
        // Show error in table
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Lỗi khi tải dữ liệu</td></tr>';
        }
        
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
    if (!tbody) {
        console.error('[renderBookingsTable] bookingsTableBody not found');
        return;
    }
    
    if (filteredBookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
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
            <td>${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}</td>
            <td><strong>${formatCurrency(booking.total_amount)}</strong></td>
            <td>${getStatusBadge(booking.status)}</td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary btn-sm" onclick="viewBookingDetails(${booking.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${booking.status !== 'cancelled' && booking.status !== 'checked_out' ? `
                        <button class="btn btn-primary btn-sm" onclick="editBooking(${booking.id})" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${booking.status !== 'cancelled' && booking.status !== 'checked_out' ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteBooking(${booking.id})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// View booking details - using a simple alert or modal for now
async function viewBookingDetails(id) {
    try {
        showLoading();
        const booking = await bookingAPI.getById(id);
        
        // Create a simple detail modal
        const detailModal = document.createElement('div');
        detailModal.className = 'modal show';
        detailModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close-btn" onclick="this.closest('.modal').remove()">&times;</span>
                <h2 style="margin-top:0; color:#333;"><i class="fas fa-calendar-check"></i> Chi Tiết Đặt Phòng</h2>
                <div class="detail-view" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Mã Đặt Phòng</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">#${booking.id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Khách Hàng</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">#${booking.customer_id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Phòng</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">#${booking.room_id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Trạng Thái</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${getStatusBadge(booking.status)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Check-in</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${formatDate(booking.check_in)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Check-out</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${formatDate(booking.check_out)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Số Người</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${booking.guests} người</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Tổng Tiền</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b; font-weight: 600;">${formatCurrency(booking.total_amount)}</div>
                    </div>
                    ${booking.special_requests ? `
                        <div class="detail-item" style="grid-column: 1 / -1;">
                            <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Yêu Cầu Đặc Biệt</div>
                            <div class="detail-value" style="font-size: 14px; color: #1e293b;">${booking.special_requests}</div>
                        </div>
                    ` : ''}
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(detailModal);
        
        // Close when clicking outside
        detailModal.onclick = function(event) {
            if (event.target === detailModal) {
                detailModal.remove();
            }
        };
    } catch (error) {
        showToast('Không thể tải thông tin đặt phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Open booking modal for adding or editing
async function openBookingModal(bookingId = null) {
    console.log('[openBookingModal] Called with bookingId:', bookingId);
    console.log('[openBookingModal] Current bookings array length:', bookings.length);
    
    const modal = document.getElementById('bookingModal');
    if (!modal) {
        console.error('[openBookingModal] bookingModal not found in DOM');
        showToast('Không tìm thấy form đặt phòng. Vui lòng tải lại trang.', 'error');
        return;
    }
    console.log('[openBookingModal] Modal element found:', modal);
    
    // Load customers and rooms
    let customers = [];
    let rooms = [];
    try {
        showLoading();
        [customers, rooms] = await Promise.all([
            customerAPI.getAll().catch(() => []),
            roomAPI.getRooms().catch(() => [])
        ]);
    } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Không thể tải dữ liệu', 'error');
        return;
    } finally {
        hideLoading();
    }
    
    // Reset form
    const form = document.getElementById('bookingForm');
    const modalTitle = document.getElementById('bookingModalTitle');
    const customerSelect = document.getElementById('bookingCustomerId');
    const roomSelect = document.getElementById('bookingRoomId');
    
    if (form) {
        form.reset();
        const bookingIdInput = document.getElementById('bookingId');
        if (bookingIdInput) bookingIdInput.value = bookingId || '';
        
        if (bookingId) {
            // Edit mode - load booking data
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                // Format dates for input (YYYY-MM-DD)
                const checkInDate = booking.check_in.split('T')[0];
                const checkOutDate = booking.check_out.split('T')[0];
                
                document.getElementById('bookingCustomerId').value = booking.customer_id || '';
                document.getElementById('bookingRoomId').value = booking.room_id || '';
                document.getElementById('bookingCheckIn').value = checkInDate;
                document.getElementById('bookingCheckOut').value = checkOutDate;
                document.getElementById('bookingGuests').value = booking.guests || 1;
                document.getElementById('bookingSpecialRequests').value = booking.special_requests || '';
                if (modalTitle) modalTitle.textContent = 'Edit Booking';
            }
        } else {
            // Add mode
            if (modalTitle) modalTitle.textContent = 'Add New Booking';
        }
    }
    
    // Populate customer select
    if (customerSelect && customers.length > 0) {
        customerSelect.innerHTML = '<option value="">Chọn khách hàng</option>' +
            customers.map(c => `<option value="${c.id}">${c.name || c.full_name || 'Customer'} (${c.email || 'N/A'})</option>`).join('');
        if (bookingId) {
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) customerSelect.value = booking.customer_id;
        }
    }
    
    // Populate room select
    if (roomSelect && rooms.length > 0) {
        roomSelect.innerHTML = '<option value="">Chọn phòng</option>' +
            rooms.map(r => `<option value="${r.id}">${r.room_number} - ${getStatusBadge(r.status)}</option>`).join('');
        if (bookingId) {
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) roomSelect.value = booking.room_id;
        }
    }
    
    // Show modal
    console.log('[openBookingModal] Adding show class to modal');
    modal.classList.add('show');
    console.log('[openBookingModal] Modal classes:', modal.className);
    console.log('[openBookingModal] Modal display style:', window.getComputedStyle(modal).display);
    console.log('[openBookingModal] Modal z-index:', window.getComputedStyle(modal).zIndex);
    
    // Setup form submit handler (only once)
    if (form && !form.dataset.handlerAttached) {
        console.log('[openBookingModal] Setting up form submit handler');
        form.addEventListener('submit', handleBookingFormSubmit);
        form.dataset.handlerAttached = 'true';
    }
}

// Close booking modal
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Handle booking form submit
async function handleBookingFormSubmit(e) {
    e.preventDefault();
    
    const bookingId = document.getElementById('bookingId').value;
    const customerId = document.getElementById('bookingCustomerId').value;
    const roomId = document.getElementById('bookingRoomId').value;
    const checkIn = document.getElementById('bookingCheckIn').value;
    const checkOut = document.getElementById('bookingCheckOut').value;
    const guests = document.getElementById('bookingGuests').value;
    const specialRequests = document.getElementById('bookingSpecialRequests').value.trim();
    
    // Validation
    if (!customerId) {
        showToast('Vui lòng chọn khách hàng', 'error');
        return;
    }
    
    if (!roomId) {
        showToast('Vui lòng chọn phòng', 'error');
        return;
    }
    
    if (!checkIn || !checkOut) {
        showToast('Vui lòng chọn ngày check-in và check-out', 'error');
        return;
    }
    
    if (new Date(checkOut) <= new Date(checkIn)) {
        showToast('Ngày check-out phải sau ngày check-in', 'error');
        return;
    }
    
    // Prepare booking data
    const bookingData = {
        customer_id: parseInt(customerId),
        room_id: parseInt(roomId),
        check_in: checkIn,
        check_out: checkOut,
        guests: parseInt(guests),
        special_requests: specialRequests || null
    };
    
    try {
        showLoading();
        
        if (bookingId) {
            // Update existing booking
            await bookingAPI.update(parseInt(bookingId), bookingData);
            showToast('Cập nhật đặt phòng thành công', 'success');
        } else {
            // Create new booking
            await bookingAPI.create(bookingData);
            showToast('Tạo đặt phòng thành công', 'success');
        }
        
        closeBookingModal();
        loadBookings();
    } catch (error) {
        console.error('Failed to save booking:', error);
        showToast(error.message || 'Không thể lưu đặt phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Edit booking
function editBooking(id) {
    console.log('[editBooking] Called with id:', id);
    console.log('[editBooking] Type of id:', typeof id);
    console.log('[editBooking] Current bookings array length:', bookings.length);
    
    if (!id) {
        console.error('[editBooking] No booking ID provided');
        showToast('Không tìm thấy ID đặt phòng', 'error');
        return;
    }
    
    // Convert to number if it's a string
    const bookingId = typeof id === 'string' ? parseInt(id) : id;
    console.log('[editBooking] Converted bookingId:', bookingId);
    
    const booking = bookings.find(b => b.id === bookingId);
    console.log('[editBooking] Found booking:', booking);
    
    if (!booking) {
        console.warn('[editBooking] Booking not found in current bookings array');
        showToast('Không tìm thấy thông tin đặt phòng. Đang tải lại...', 'info');
        // Try to reload bookings and then open modal
        loadBookings().then(() => {
            setTimeout(() => openBookingModal(bookingId), 500);
        });
        return;
    }
    
    openBookingModal(bookingId);
}

// Delete booking
async function deleteBooking(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) {
        showToast('Không tìm thấy đặt phòng', 'error');
        return;
    }
    
    // Confirm deletion
    const confirmed = await confirmAction(
        `Bạn có chắc chắn muốn xóa đặt phòng #${booking.id}? Hành động này không thể hoàn tác.`,
        'Xác nhận xóa đặt phòng'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        showLoading();
        await bookingAPI.delete(id);
        showToast('Xóa đặt phòng thành công', 'success');
        loadBookings();
    } catch (error) {
        console.error('Failed to delete booking:', error);
        showToast(error.message || 'Không thể xóa đặt phòng', 'error');
    } finally {
        hideLoading();
    }
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

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBookingsPage);
} else {
    initBookingsPage();
}

function initBookingsPage() {
    // Check if we're on the bookings management page
    if (document.getElementById('bookingsTableBody')) {
        loadBookings();
        
        // Close modal when clicking outside
        const bookingModal = document.getElementById('bookingModal');
        if (bookingModal) {
            window.onclick = function(event) {
                if (event.target === bookingModal) {
                    closeBookingModal();
                }
            };
        }
    }
}

// Export
window.loadBookings = loadBookings;
window.showBookingModal = showBookingModal;
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.editBooking = editBooking;
window.deleteBooking = deleteBooking;
window.cancelBooking = cancelBooking;
window.viewBookingDetails = viewBookingDetails;

