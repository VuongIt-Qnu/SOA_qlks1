// Customers management

let customers = [];
let filteredCustomers = [];

// Load customers
async function loadCustomers() {
    // Support both IDs: custTableBody (customers.html) and customersTableBody (admin.html)
    const tbody = document.getElementById('customersTableBody') || document.getElementById('custTableBody');
    
    // Show loading in table
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Đang tải dữ liệu...</td></tr>';
    }
    
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('No token found, redirecting to login');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center">Vui lòng đăng nhập...</td></tr>';
            }
            window.location.href = 'user.html#login';
            return;
        }
        
        showLoading();
        console.log('[loadCustomers] Calling customerAPI.getAll()...');
        customers = await customerAPI.getAll();
        console.log('[loadCustomers] Received customers:', customers?.length || 0, customers);
        filteredCustomers = [...customers];
        renderCustomersTable();
        setupCustomerSearch();
    } catch (error) {
        console.error('[loadCustomers] Failed to load customers:', error);
        console.error('[loadCustomers] Error status:', error.status);
        console.error('[loadCustomers] Error message:', error.message);
        console.error('[loadCustomers] Error data:', error.data);
        
        // Show error in table
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Lỗi khi tải dữ liệu</td></tr>';
        }
        
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
    } finally {
        hideLoading();
    }
}

// Setup search functionality
function setupCustomerSearch() {
    // Support both IDs: searchKeyword (customers.html) and customerSearch (admin.html)
    const searchInput = document.getElementById('customerSearch') || document.getElementById('searchKeyword');
    if (!searchInput) {
        console.warn('Customer search input not found');
        return;
    }
    
    searchInput.addEventListener('input', debounce((e) => {
        applyCustomerFilters();
    }, 300));
    
    const filterTag = document.getElementById('filterTag');
    const filterStatus = document.getElementById('filterStatus');
    
    if (filterTag) {
        filterTag.addEventListener('change', () => {
            applyCustomerFilters();
        });
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            applyCustomerFilters();
        });
    }
}

function applyCustomerFilters() {
    // Support both IDs: searchKeyword (customers.html) and customerSearch (admin.html)
    const searchInput = document.getElementById('customerSearch') || document.getElementById('searchKeyword');
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const filterTag = document.getElementById('filterTag')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    
    filteredCustomers = customers.filter(customer => {
        const matchSearch = !searchTerm || 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.includes(searchTerm));
        
        // Note: Tag and Status filters may not be available in customer data
        // If needed, these would need to be added to the customer model
        return matchSearch;
    });
    
    renderCustomersTable();
}

// Render customers table
function renderCustomersTable() {
    // Support both IDs: custTableBody (customers.html) and customersTableBody (admin.html)
    const tbody = document.getElementById('customersTableBody') || document.getElementById('custTableBody');
    if (!tbody) {
        console.error('Customer table body not found (checked: customersTableBody, custTableBody)');
        return;
    }
    
    if (filteredCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
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
    
    tbody.innerHTML = filteredCustomers.map(customer => {
        const profile = customer.profile || {};
        return `
        <tr class="fade-in">
            <td>${customer.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                        ${customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong>${customer.name}</strong><br>
                        <small style="color: #64748b;">${customer.email}</small>
                    </div>
                </div>
            </td>
            <td>${formatPhone(customer.phone) || '-'}</td>
            <td>${profile.id_card || '-'}</td>
            <td>${profile.nationality || '-'}</td>
            <td><span class="badge-table user">User</span></td>
            <td><span class="badge-table">-</span></td>
            <td><span class="badge-table success">Active</span></td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary btn-sm" onclick="viewCustomerDetails(${customer.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="editCustomer(${customer.id})" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${customer.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// View customer details
async function viewCustomerDetails(id) {
    try {
        showLoading();
        const customer = await customerAPI.getById(id);
        
        // Create a simple detail modal
        const detailModal = document.createElement('div');
        detailModal.className = 'modal show';
        detailModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close-btn" onclick="this.closest('.modal').remove()">&times;</span>
                <h2 style="margin-top:0; color:#333;"><i class="fas fa-user"></i> Chi Tiết Khách Hàng</h2>
                <div class="detail-view" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">ID</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">#${customer.id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Họ và Tên</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${customer.name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Email</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${customer.email}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Số Điện Thoại</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${formatPhone(customer.phone) || '-'}</div>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Địa Chỉ</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${customer.address || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label" style="font-weight: 600; color: #64748b; font-size: 12px; margin-bottom: 4px;">Ngày Tạo</div>
                        <div class="detail-value" style="font-size: 14px; color: #1e293b;">${formatDate(customer.created_at)}</div>
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove(); editCustomer(${customer.id});" style="margin-left: 10px;">
                        <i class="fas fa-edit"></i> Sửa Thông Tin
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
        showToast('Không thể tải thông tin khách hàng', 'error');
    } finally {
        hideLoading();
    }
}

// Open customer modal for adding or editing
async function openModal(customerId = null) {
    console.log('[openModal] Called with customerId:', customerId);
    console.log('[openModal] Current customers array length:', customers.length);
    
    const modal = document.getElementById('custModal');
    if (!modal) {
        console.error('[openModal] custModal not found in DOM');
        showToast('Không tìm thấy form khách hàng. Vui lòng tải lại trang.', 'error');
        return;
    }
    console.log('[openModal] Modal element found:', modal);
    
    // Reset form
    const form = document.getElementById('custForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (form) {
        form.reset();
        const customerIdInput = document.getElementById('custId');
        if (customerIdInput) customerIdInput.value = customerId || '';
        
        if (customerId) {
            // Edit mode - load customer data
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                document.getElementById('fullName').value = customer.name || '';
                document.getElementById('email').value = customer.email || '';
                document.getElementById('phone').value = customer.phone || '';
                document.getElementById('address').value = customer.address || '';
                
                // Load profile data if available
                const profile = customer.profile || {};
                if (profile) {
                    document.getElementById('passport').value = profile.id_card || '';
                    document.getElementById('nationality').value = profile.nationality || '';
                    document.getElementById('notes').value = profile.notes || '';
                }
                
                // Note: address, role, status, tags, password are not in backend Customer model
                // These fields may need to be handled separately or removed
                
                if (modalTitle) modalTitle.textContent = 'Edit Customer Profile';
            }
        } else {
            // Add mode
            if (modalTitle) modalTitle.textContent = 'Add New Customer';
        }
    }
    
    // Show modal
    console.log('[openModal] Adding show class to modal');
    modal.classList.add('show');
    console.log('[openModal] Modal classes:', modal.className);
    console.log('[openModal] Modal display style:', window.getComputedStyle(modal).display);
    
    // Setup form submit handler (only once)
    if (form && !form.dataset.handlerAttached) {
        console.log('[openModal] Setting up form submit handler');
        form.addEventListener('submit', handleCustomerFormSubmit);
        form.dataset.handlerAttached = 'true';
    }
}

// Close customer modal
function closeModal() {
    const modal = document.getElementById('custModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Handle customer form submit
async function handleCustomerFormSubmit(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('custId').value;
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address')?.value.trim() || null;
    
    // Validation
    if (!fullName) {
        showToast('Vui lòng nhập họ và tên', 'error');
        return;
    }
    
    if (!email) {
        showToast('Vui lòng nhập email', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Email không hợp lệ', 'error');
        return;
    }
    
    if (!phone) {
        showToast('Vui lòng nhập số điện thoại', 'error');
        return;
    }
    
    if (!validatePhone(phone)) {
        showToast('Số điện thoại không hợp lệ (10-11 số)', 'error');
        return;
    }
    
    // Prepare customer data (only fields that exist in backend)
    const customerData = {
        name: fullName,
        email: email,
        phone: phone,
        address: address
    };
    
    try {
        showLoading();
        
        if (customerId) {
            // Update existing customer
            await customerAPI.update(parseInt(customerId), customerData);
            showToast('Cập nhật khách hàng thành công', 'success');
        } else {
            // Create new customer
            await customerAPI.create(customerData);
            showToast('Thêm khách hàng thành công', 'success');
        }
        
        closeModal();
        loadCustomers();
    } catch (error) {
        console.error('Failed to save customer:', error);
        showToast(error.message || 'Không thể lưu khách hàng', 'error');
    } finally {
        hideLoading();
    }
}

// Edit customer
function editCustomer(id) {
    console.log('[editCustomer] Called with id:', id);
    console.log('[editCustomer] Type of id:', typeof id);
    console.log('[editCustomer] Current customers array length:', customers.length);
    
    if (!id) {
        console.error('[editCustomer] No customer ID provided');
        showToast('Không tìm thấy ID khách hàng', 'error');
        return;
    }
    
    // Convert to number if it's a string
    const customerId = typeof id === 'string' ? parseInt(id) : id;
    console.log('[editCustomer] Converted customerId:', customerId);
    
    const customer = customers.find(c => c.id === customerId);
    console.log('[editCustomer] Found customer:', customer);
    
    if (!customer) {
        console.warn('[editCustomer] Customer not found in current customers array');
        showToast('Không tìm thấy thông tin khách hàng. Đang tải lại...', 'info');
        // Try to reload customers and then open modal
        loadCustomers().then(() => {
            setTimeout(() => openModal(customerId), 500);
        });
        return;
    }
    
    openModal(customerId);
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

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomersPage);
} else {
    initCustomersPage();
}

function initCustomersPage() {
    // Check if we're on the customers management page (support both IDs)
    const tbody = document.getElementById('custTableBody') || document.getElementById('customersTableBody');
    if (tbody) {
        loadCustomers();
        
        // Close modal when clicking outside
        const customerModal = document.getElementById('custModal');
        if (customerModal) {
            window.onclick = function(event) {
                if (event.target === customerModal) {
                    closeModal();
                }
            };
        }
    }
}

// Export for use in main.js
window.loadCustomers = loadCustomers;
window.showCustomerModal = showCustomerModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.viewCustomerDetails = viewCustomerDetails;
window.renderTable = applyCustomerFilters;

