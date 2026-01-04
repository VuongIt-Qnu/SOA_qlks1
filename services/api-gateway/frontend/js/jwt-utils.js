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
    if (!token) {
        console.log('getUserRoles: No token found');
        return [];
    }
    
    const payload = decodeJWT(token);
    const roles = payload?.roles || [];
    
    console.log('getUserRoles: payload=', payload);
    console.log('getUserRoles: roles from payload=', roles);
    console.log('getUserRoles: roles type=', typeof roles, Array.isArray(roles));
    
    // Normalize roles to array of lowercase strings
    if (Array.isArray(roles)) {
        return roles.map(r => {
            let roleStr = '';
            if (typeof r === 'string') {
                roleStr = r;
            } else if (r && typeof r === 'object' && r.name) {
                roleStr = r.name;
            } else {
                roleStr = String(r);
            }
            // Normalize to lowercase and trim
            return roleStr.toLowerCase().trim();
        });
    } else if (roles) {
        return [String(roles).toLowerCase().trim()];
    }
    
    return [];
}

// Check if user has role
function hasRole(role) {
    const roles = getUserRoles();
    return roles.includes(role);
}

// Check if user is admin (case-insensitive)
function isAdmin() {
    const roles = getUserRoles();
    const adminRoles = ['admin', 'manager', 'receptionist'];
    return roles.some(role => adminRoles.includes(role.toLowerCase().trim()));
}

// Helper function to check if user has admin role (consistent across all files)
function checkIsAdmin(roles) {
    if (!Array.isArray(roles)) {
        roles = roles ? [String(roles)] : [];
    }
    
    // Normalize to lowercase
    const normalizedRoles = roles.map(r => String(r).toLowerCase().trim());
    const adminRoles = ['admin', 'manager', 'receptionist'];
    
    return normalizedRoles.some(role => adminRoles.includes(role));
}

// Export
window.decodeJWT = decodeJWT;
window.getUserRoles = getUserRoles;
window.hasRole = hasRole;
window.isAdmin = isAdmin;
window.checkIsAdmin = checkIsAdmin;

