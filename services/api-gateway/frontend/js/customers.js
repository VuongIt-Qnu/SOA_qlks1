// Customers management

let customers = [];
let filteredCustomers = [];

// Load customers
async function loadCustomers() {
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('No token found, redirecting to login');
            window.location.href = 'user.html#login';
            return;
        }
        
        showLoading();
        customers = await customerAPI.getAll();
        filteredCustomers = [...customers];
        renderCustomersTable();
        setupCustomerSearch();
    } catch (error) {
        console.error('Failed to load customers:', error);
        
        // Check if it's an authentication error
        if (error.status === 401 || error.status === 403 || error.message?.includes('Unauthorized')) {
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            removeToken();
            setTimeout(() => {
                window.location.href = 'user.html#login';
            }, 2000);
        } else {
            showToast(error.message || 'Không thể tải danh sách khách hàng', 'error');
        }
        
        const tbody = document.getElementById('customersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Lỗi khi tải dữ liệu</td></tr>';
        }
    } finally {
        hideLoading();
    }
}

// Setup search functionality
function setupCustomerSearch() {
    const searchInput = document.getElementById('customerSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        if (searchTerm === '') {
            filteredCustomers = [...customers];
        } else {
            filteredCustomers = customers.filter(customer => 
                customer.name.toLowerCase().includes(searchTerm) ||
                customer.email.toLowerCase().includes(searchTerm) ||
                customer.phone.includes(searchTerm)
            );
        }
        renderCustomersTable();
    }, 300));
}

// Render customers table
function renderCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    
    if (filteredCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>${customers.length === 0 ? 'Chưa có khách hàng nào' : 'Không tìm thấy kết quả'}</h3>
                        <p>${customers.length === 0 ? 'Hãy thêm khách hàng đầu tiên' : 'Thử tìm kiếm với từ khóa khác'}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredCustomers.map(customer => `
        <tr class="fade-in">
            <td>${customer.id}</td>
            <td><strong>${customer.name}</strong></td>
            <td>${customer.email}</td>
            <td>${formatPhone(customer.phone)}</td>
            <td>${customer.address || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="viewCustomerDetails(${customer.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="editCustomer(${customer.id})" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${customer.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// View customer details
async function viewCustomerDetails(id) {
    try {
        showLoading();
        const customer = await customerAPI.getById(id);
        
        const content = `
            <h2><i class="fas fa-user"></i> Chi Tiết Khách Hàng</h2>
            <div class="detail-view">
                <div class="detail-item">
                    <div class="detail-label">ID</div>
                    <div class="detail-value">#${customer.id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Họ và Tên</div>
                    <div class="detail-value">${customer.name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${customer.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Số Điện Thoại</div>
                    <div class="detail-value">${formatPhone(customer.phone)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Địa Chỉ</div>
                    <div class="detail-value">${customer.address || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Ngày Tạo</div>
                    <div class="detail-value">${formatDate(customer.created_at)}</div>
                </div>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeAllModals()">
                    <i class="fas fa-times"></i> Đóng
                </button>
                <button class="btn btn-primary" onclick="closeAllModals(); editCustomer(${customer.id})">
                    <i class="fas fa-edit"></i> Sửa Thông Tin
                </button>
            </div>
        `;
        
        showModal(content);
    } catch (error) {
        showToast('Không thể tải thông tin khách hàng', 'error');
    } finally {
        hideLoading();
    }
}

// Show customer modal
function showCustomerModal(customerId = null) {
    const customer = customerId ? customers.find(c => c.id === customerId) : null;
    
    const content = `
        <h2>${customer ? 'Sửa' : 'Thêm'} Khách Hàng</h2>
        <form id="customerForm">
            <div class="form-group">
                <label>Họ và Tên *</label>
                <input type="text" id="customerName" class="form-control" 
                    value="${customer ? customer.name : ''}" required>
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="customerEmail" class="form-control" 
                    value="${customer ? customer.email : ''}" required>
            </div>
            <div class="form-group">
                <label>Số Điện Thoại *</label>
                <input type="tel" id="customerPhone" class="form-control" 
                    value="${customer ? customer.phone : ''}" required>
            </div>
            <div class="form-group">
                <label>Địa Chỉ</label>
                <input type="text" id="customerAddress" class="form-control" 
                    value="${customer ? customer.address || '' : ''}">
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i> ${customer ? 'Cập Nhật' : 'Thêm'}
                </button>
            </div>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('customerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerData = {
            name: document.getElementById('customerName').value,
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('customerPhone').value,
            address: document.getElementById('customerAddress').value
        };
        
        // Validation
        if (!validateEmail(customerData.email)) {
            showToast('Email không hợp lệ', 'error');
            return;
        }
        
        if (!validatePhone(customerData.phone)) {
            showToast('Số điện thoại không hợp lệ (10-11 số)', 'error');
            return;
        }
        
        try {
            showLoading();
            if (customer) {
                await customerAPI.update(customer.id, customerData);
                showToast('Cập nhật khách hàng thành công', 'success');
            } else {
                await customerAPI.create(customerData);
                showToast('Thêm khách hàng thành công', 'success');
            }
            closeAllModals();
            loadCustomers();
        } catch (error) {
            showToast(error.message || 'Không thể lưu khách hàng', 'error');
        } finally {
            hideLoading();
        }
    });
}

// Edit customer
function editCustomer(id) {
    showCustomerModal(id);
}

// Delete customer
async function deleteCustomer(id) {
    const confirmed = await confirmAction(
        'Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác.',
        'Xác nhận xóa'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading();
        await customerAPI.delete(id);
        showToast('Xóa khách hàng thành công', 'success');
        loadCustomers();
    } catch (error) {
        showToast(error.message || 'Không thể xóa khách hàng', 'error');
    } finally {
        hideLoading();
    }
}

// Export for use in main.js
window.loadCustomers = loadCustomers;
window.showCustomerModal = showCustomerModal;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.viewCustomerDetails = viewCustomerDetails;

