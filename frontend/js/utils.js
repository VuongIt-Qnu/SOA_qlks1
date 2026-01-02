// Utility functions for UI improvements

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info} toast-icon"></i>
        <div class="toast-content">${message}</div>
        <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Loading overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format phone number
function formatPhone(phone) {
    if (!phone) return '-';
    // Format: 0123 456 789
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone
function validatePhone(phone) {
    const re = /^[0-9]{10,11}$/;
    return re.test(phone.replace(/\s/g, ''));
}

// Confirm dialog with better styling
function confirmAction(message, title = 'Xác nhận') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Hủy';
        cancelBtn.onclick = () => {
            modal.remove();
            resolve(false);
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> Xác nhận';
        confirmBtn.onclick = () => {
            modal.remove();
            resolve(true);
        };
        
        const actions = document.createElement('div');
        actions.className = 'form-actions';
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.onclick = (e) => e.stopPropagation();
        content.innerHTML = `
            <h2>${title}</h2>
            <p style="margin: 1.5rem 0;">${message}</p>
        `;
        content.appendChild(actions);
        
        modal.appendChild(content);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
        
        document.body.appendChild(modal);
    });
}

// Export functions
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.debounce = debounce;
window.formatPhone = formatPhone;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.confirmAction = confirmAction;

