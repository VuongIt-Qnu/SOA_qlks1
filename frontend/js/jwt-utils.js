// JWT utility functions

// Decode JWT token (without verification - client side only)
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

// Get user roles from token
function getUserRoles() {
    const token = getToken();
    if (!token) return [];
    
    const payload = decodeJWT(token);
    return payload?.roles || [];
}

// Check if user has role
function hasRole(role) {
    const roles = getUserRoles();
    return roles.includes(role);
}

// Check if user is admin
function isAdmin() {
    return hasRole('admin') || hasRole('manager') || hasRole('receptionist');
}

// Export
window.decodeJWT = decodeJWT;
window.getUserRoles = getUserRoles;
window.hasRole = hasRole;
window.isAdmin = isAdmin;

