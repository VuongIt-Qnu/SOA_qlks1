// Payments management

let payments = [];
let filteredPayments = [];

// Load payments
async function loadPayments() {
    const tbody = document.getElementById('paymentsTableBody');
    
    // Show loading in table
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>';
    }
    
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('No token found, redirecting to login');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">Vui lòng đăng nhập...</td></tr>';
            }
            window.location.href = 'user.html#login';
            return;
        }
        
        showLoading();
        payments = await paymentAPI.getAll();
        filteredPayments = [...payments];
        renderPaymentsTable();
        setupPaymentSearch();
    } catch (error) {
        console.error('Failed to load payments:', error);
        
        // Show error in table
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Lỗi khi tải dữ liệu</td></tr>';
        }
        
        // Check if it's an authentication error
        if (error.status === 401 || error.status === 403 || error.message?.includes('Unauthorized')) {
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            removeToken();
            setTimeout(() => {
                window.location.href = 'user.html#login';
            }, 2000);
        } else {
            showToast(error.message || 'Không thể tải danh sách thanh toán', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Setup search and filter
function setupPaymentSearch() {
    const searchInput = document.getElementById('paymentSearch');
    const statusFilter = document.getElementById('paymentStatusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyPaymentFilters();
        }, 300));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            applyPaymentFilters();
        });
    }
}

function applyPaymentFilters() {
    const searchTerm = document.getElementById('paymentSearch')?.value.toLowerCase().trim() || '';
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || '';
    
    filteredPayments = payments.filter(payment => {
        const matchSearch = !searchTerm || 
            payment.id.toString().includes(searchTerm) ||
            payment.booking_id.toString().includes(searchTerm) ||
            (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchTerm));
        // Match status case-insensitively (API returns uppercase, filter might be uppercase or lowercase)
        const matchStatus = !statusFilter || 
            payment.payment_status?.toUpperCase() === statusFilter.toUpperCase();
        return matchSearch && matchStatus;
    });
    
    renderPaymentsTable();
}

// Render payments table
function renderPaymentsTable() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) {
        console.error('[renderPaymentsTable] paymentsTableBody not found');
        return;
    }
    
    if (filteredPayments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-credit-card"></i>
                        <h3>${payments.length === 0 ? 'Chưa có thanh toán nào' : 'Không tìm thấy kết quả'}</h3>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Helper function to map payment method
    const getPaymentMethodName = (method) => {
        const methodMap = {
            'CASH': 'Tiền mặt',
            'CARD': 'Thẻ',
            'BANK_TRANSFER': 'Chuyển khoản',
            'E_WALLET': 'Ví điện tử'
        };
        return methodMap[method] || method;
    };
    
    tbody.innerHTML = filteredPayments.map(payment => {
        const status = (payment.payment_status || '').toLowerCase();

        return `
        <tr class="fade-in">
            <td><strong>#${payment.id}</strong></td>
            <td>#${payment.booking_id}</td>
            <td><strong>${formatCurrency(payment.amount)}</strong></td>
            <td>${getPaymentMethodName(payment.payment_method)}</td>
            <td>${getStatusBadge(payment.payment_status)}</td>
            <td>${payment.transaction_id || '-'}</td>
            <td>${formatDate(payment.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="showPaymentModal(${payment.id})" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="completePayment(${payment.id})" title="Hoàn tất">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${status === 'paid' ? `
                        <button class="btn btn-warning btn-sm" onclick="refundPayment(${payment.id})" title="Hoàn tiền">
                            <i class="fas fa-undo"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// Show payment modal
async function showPaymentModal(paymentId = null) {
    console.log('[showPaymentModal] Called with paymentId:', paymentId);
    
    // Load bookings
    const bookings = await bookingAPI.getAll().catch((error) => {
        console.error('[showPaymentModal] Failed to load bookings:', error);
        return [];
    });
    console.log('[showPaymentModal] Loaded bookings:', bookings.length);
    
    const payment = paymentId ? payments.find(p => p.id === parseInt(paymentId)) : null;
    console.log('[showPaymentModal] Found payment:', payment);
    
    const modal = document.getElementById('paymentModal');
    const modalTitle = document.getElementById('paymentModalTitle');
    const form = document.getElementById('paymentForm');
    
    if (!modal || !modalTitle || !form) {
        console.error('Payment modal elements not found');
        return;
    }
    
    // Set title
    modalTitle.textContent = payment ? 'Edit Payment' : 'Add Payment';
    
    // Populate booking options
    const bookingSelect = document.getElementById('paymentBookingId');
    bookingSelect.innerHTML = '<option value="">Select Booking</option>';
    bookings.forEach(booking => {
        const option = document.createElement('option');
        option.value = booking.id;
        option.textContent = `#${booking.id} - ${formatDate(booking.check_in)} to ${formatDate(booking.check_out)}`;
        if (payment && payment.booking_id === booking.id) {
            option.selected = true;
        }
        bookingSelect.appendChild(option);
    });
    
    // Populate form if editing
    if (payment) {
        document.getElementById('paymentId').value = payment.id;
        document.getElementById('paymentAmount').value = payment.amount;
        document.getElementById('paymentMethod').value = payment.payment_method.toLowerCase();
        document.getElementById('paymentTransactionId').value = payment.transaction_id || '';
        document.getElementById('paymentNotes').value = payment.notes || '';
    } else {
        // Reset form for new payment
        document.getElementById('paymentId').value = '';
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentMethod').value = 'cash';
        document.getElementById('paymentTransactionId').value = '';
        document.getElementById('paymentNotes').value = '';
    }
    
    // Show modal
    modal.classList.add('show');
    
    // Handle form submit
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const bookingId = document.getElementById('paymentBookingId').value;
        const amount = document.getElementById('paymentAmount').value;
        const method = document.getElementById('paymentMethod').value;
        
        if (!bookingId) {
            showToast('Please select a booking', 'error');
            return;
        }
        if (!amount || amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }
        if (!method) {
            showToast('Please select payment method', 'error');
            return;
        }
        
        const paymentData = {
            booking_id: parseInt(bookingId),
            amount: parseFloat(amount),
            payment_method: method.toUpperCase(),
            transaction_id: document.getElementById('paymentTransactionId').value || null,
            notes: document.getElementById('paymentNotes').value || null
        };
        
        try {
            showLoading();
            if (payment) {
                // Update - but API may not have update endpoint
                showToast('Update not implemented yet', 'warning');
            } else {
                await paymentAPI.create(paymentData);
                showToast('Payment created successfully', 'success');
                closeModal();
                loadPayments();
            }
        } catch (error) {
            showToast(error.message || 'Failed to create payment', 'error');
        } finally {
            hideLoading();
        }
    };
}

// Complete payment
async function completePayment(id) {
    const confirmed = await confirmAction(
        'Xác nhận hoàn tất thanh toán này?',
        'Xác nhận hoàn tất'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading();
        await paymentAPI.complete(id);
        showToast('Hoàn tất thanh toán thành công', 'success');
        loadPayments();
    } catch (error) {
        showToast(error.message || 'Không thể hoàn tất thanh toán', 'error');
    } finally {
        hideLoading();
    }
}

// Refund payment
async function refundPayment(id) {
    const confirmed = await confirmAction(
        'Bạn có chắc chắn muốn hoàn tiền cho thanh toán này?',
        'Xác nhận hoàn tiền'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading();
        await paymentAPI.refund(id);
        showToast('Hoàn tiền thành công', 'success');
        loadPayments();
    } catch (error) {
        showToast(error.message || 'Không thể hoàn tiền', 'error');
    } finally {
        hideLoading();
    }
}

// Initialize when page loads
function initPaymentsPage() {
    // Check if we're on the payments management page
    if (document.getElementById('paymentsTableBody')) {
        loadPayments();
    }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaymentsPage);
} else {
    initPaymentsPage();
}

// Close modal
function closeModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Export
window.loadPayments = loadPayments;
window.initPaymentsPage = initPaymentsPage;
window.showPaymentModal = showPaymentModal;
window.completePayment = completePayment;
window.refundPayment = refundPayment;
window.closeModal = closeModal;

