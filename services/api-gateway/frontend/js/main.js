// Main application logic

// Show page
function showPage(pageName) {
    // Check if we're on admin page
    if (document.body.classList.contains('admin-layout')) {
        if (typeof showAdminPage === 'function') {
            showAdminPage(pageName);
        }
        return;
    }
    
    // Check if we're on user page
    if (document.body.classList.contains('user-layout')) {
        if (typeof showUserPage === 'function') {
            showUserPage(pageName);
        }
        return;
    }
    
    // Default behavior for main index.html
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const pageElement = document.getElementById(`${pageName}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });
    
    // Load page data
    loadPageData(pageName);
}

// Load page data
function loadPageData(pageName) {
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'rooms':
            loadRoomTypes();
            loadRooms();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Navigation event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page && getToken()) {
                showPage(page);
            } else if (!getToken()) {
                showLoginUI();
            }
        });
    });
});

// Modal functions
function showModal(content) {
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.add('show');
}

function closeAllModals() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function formatCurrency(amount) {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function getStatusBadge(status) {
    const badges = {
        'available': '<span class="badge badge-success">Có sẵn</span>',
        'occupied': '<span class="badge badge-danger">Đã thuê</span>',
        'maintenance': '<span class="badge badge-warning">Bảo trì</span>',
        'pending': '<span class="badge badge-warning">Chờ xử lý</span>',
        'confirmed': '<span class="badge badge-success">Đã xác nhận</span>',
        'cancelled': '<span class="badge badge-danger">Đã hủy</span>',
        'completed': '<span class="badge badge-success">Hoàn thành</span>',
        'failed': '<span class="badge badge-danger">Thất bại</span>',
        'refunded': '<span class="badge badge-info">Đã hoàn tiền</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
}

// Export functions for other modules
window.showPage = showPage;
window.showModal = showModal;
window.closeAllModals = closeAllModals;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.getStatusBadge = getStatusBadge;

