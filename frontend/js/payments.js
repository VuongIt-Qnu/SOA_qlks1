// Payments management

let payments = [];
let filteredPayments = [];

// Load payments
async function loadPayments() {
    try {
        showLoading();
        payments = await paymentAPI.getAll();
        filteredPayments = [...payments];
        renderPaymentsTable();
        setupPaymentSearch();
    } catch (error) {
        console.error('Failed to load payments:', error);
        showToast('Không thể tải danh sách thanh toán', 'error');
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
        const matchStatus = !statusFilter || payment.payment_status === statusFilter;
        return matchSearch && matchStatus;
    });
    
    renderPaymentsTable();
}

// Render payments table
function renderPaymentsTable() {
    const tbody = document.getElementById('paymentsTableBody');
    
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
    
    tbody.innerHTML = filteredPayments.map(payment => `
        <tr class="fade-in">
            <td><strong>#${payment.id}</strong></td>
            <td>#${payment.booking_id}</td>
            <td><strong>${formatCurrency(payment.amount)}</strong></td>
            <td>${payment.payment_method === 'cash' ? 'Tiền mặt' : payment.payment_method === 'card' ? 'Thẻ' : 'Chuyển khoản'}</td>
            <td>${getStatusBadge(payment.payment_status)}</td>
            <td>${payment.transaction_id || '-'}</td>
            <td>${formatDate(payment.created_at)}</td>
            <td>
                <div class="action-buttons">
                    ${payment.payment_status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="completePayment(${payment.id})" title="Hoàn tất">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${payment.payment_status === 'completed' ? `
                        <button class="btn btn-warning btn-sm" onclick="refundPayment(${payment.id})" title="Hoàn tiền">
                            <i class="fas fa-undo"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Show payment modal
async function showPaymentModal(paymentId = null) {
    // Load bookings
    const bookings = await bookingAPI.getAll().catch(() => []);
    
    const payment = paymentId ? payments.find(p => p.id === paymentId) : null;
    
    const content = `
        <h2>${payment ? 'Sửa' : 'Tạo'} Thanh Toán</h2>
        <form id="paymentForm">
            <div class="form-group">
                <label>Mã Đặt Phòng *</label>
                <select id="paymentBookingId" class="form-control" required>
                    <option value="">Chọn đặt phòng</option>
                    ${bookings.map(b => `
                        <option value="${b.id}" ${payment && payment.booking_id === b.id ? 'selected' : ''}>
                            #${b.id} - ${formatDate(b.check_in)} đến ${formatDate(b.check_out)}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Số Tiền (VND) *</label>
                <input type="number" id="paymentAmount" class="form-control" 
                    value="${payment ? payment.amount : ''}" required min="0" step="1000">
            </div>
            <div class="form-group">
                <label>Phương Thức Thanh Toán *</label>
                <select id="paymentMethod" class="form-control" required>
                    <option value="cash" ${payment && payment.payment_method === 'cash' ? 'selected' : ''}>Tiền mặt</option>
                    <option value="card" ${payment && payment.payment_method === 'card' ? 'selected' : ''}>Thẻ</option>
                    <option value="bank_transfer" ${payment && payment.payment_method === 'bank_transfer' ? 'selected' : ''}>Chuyển khoản</option>
                </select>
            </div>
            <div class="form-group">
                <label>Mã Giao Dịch</label>
                <input type="text" id="paymentTransactionId" class="form-control" 
                    value="${payment ? payment.transaction_id || '' : ''}">
            </div>
            <div class="form-group">
                <label>Ghi Chú</label>
                <textarea id="paymentNotes" class="form-control" rows="3">${payment ? payment.notes || '' : ''}</textarea>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i> ${payment ? 'Cập Nhật' : 'Tạo Thanh Toán'}
                </button>
            </div>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const paymentData = {
            booking_id: parseInt(document.getElementById('paymentBookingId').value),
            amount: parseFloat(document.getElementById('paymentAmount').value),
            payment_method: document.getElementById('paymentMethod').value,
            transaction_id: document.getElementById('paymentTransactionId').value || null,
            notes: document.getElementById('paymentNotes').value || null
        };
        
        try {
            showLoading();
            await paymentAPI.create(paymentData);
            showToast('Tạo thanh toán thành công', 'success');
            closeAllModals();
            loadPayments();
        } catch (error) {
            showToast(error.message || 'Không thể tạo thanh toán', 'error');
        } finally {
            hideLoading();
        }
    });
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

// Export
window.loadPayments = loadPayments;
window.showPaymentModal = showPaymentModal;
window.completePayment = completePayment;
window.refundPayment = refundPayment;

