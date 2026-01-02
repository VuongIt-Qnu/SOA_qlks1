// API Configuration
const API_CONFIG = {
    AUTH: 'http://localhost:8001',
    CUSTOMER: 'http://localhost:8002',
    ROOM: 'http://localhost:8003',
    BOOKING: 'http://localhost:8004',
    PAYMENT: 'http://localhost:8005',
    REPORT: 'http://localhost:8006'
};

// Get stored token
function getToken() {
    return localStorage.getItem('auth_token');
}

// Set token
function setToken(token) {
    localStorage.setItem('auth_token', token);
}

// Remove token
function removeToken() {
    localStorage.removeItem('auth_token');
}

// Make API request
async function apiRequest(url, options = {}) {
    const token = getToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Auth API
const authAPI = {
    register: async (userData) => {
        return apiRequest(`${API_CONFIG.AUTH}/register`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    login: async (username, password) => {
        return apiRequest(`${API_CONFIG.AUTH}/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    getMe: async () => {
        return apiRequest(`${API_CONFIG.AUTH}/me`);
    }
};

// Customer API
const customerAPI = {
    getAll: async () => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/customers`);
    },
    
    getById: async (id) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/customers/${id}`);
    },
    
    create: async (customerData) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/customers`, {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    },
    
    update: async (id, customerData) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
    },
    
    delete: async (id) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/customers/${id}`, {
            method: 'DELETE'
        });
    }
};

// Room API
const roomAPI = {
    getRoomTypes: async () => {
        return apiRequest(`${API_CONFIG.ROOM}/room-types`);
    },
    
    createRoomType: async (roomTypeData) => {
        return apiRequest(`${API_CONFIG.ROOM}/room-types`, {
            method: 'POST',
            body: JSON.stringify(roomTypeData)
        });
    },
    
    getRooms: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return apiRequest(`${API_CONFIG.ROOM}/rooms${params ? '?' + params : ''}`);
    },
    
    getRoomById: async (id) => {
        return apiRequest(`${API_CONFIG.ROOM}/rooms/${id}`);
    },
    
    createRoom: async (roomData) => {
        return apiRequest(`${API_CONFIG.ROOM}/rooms`, {
            method: 'POST',
            body: JSON.stringify(roomData)
        });
    },
    
    updateRoom: async (id, roomData) => {
        return apiRequest(`${API_CONFIG.ROOM}/rooms/${id}`, {
            method: 'PUT',
            body: JSON.stringify(roomData)
        });
    }
};

// Booking API
const bookingAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return apiRequest(`${API_CONFIG.BOOKING}/bookings${params ? '?' + params : ''}`);
    },
    
    getById: async (id) => {
        return apiRequest(`${API_CONFIG.BOOKING}/bookings/${id}`);
    },
    
    create: async (bookingData) => {
        return apiRequest(`${API_CONFIG.BOOKING}/bookings`, {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    },
    
    update: async (id, bookingData) => {
        return apiRequest(`${API_CONFIG.BOOKING}/bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(bookingData)
        });
    },
    
    cancel: async (id) => {
        return apiRequest(`${API_CONFIG.BOOKING}/bookings/${id}/cancel`, {
            method: 'PUT'
        });
    }
};

// Payment API
const paymentAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return apiRequest(`${API_CONFIG.PAYMENT}/payments${params ? '?' + params : ''}`);
    },
    
    getById: async (id) => {
        return apiRequest(`${API_CONFIG.PAYMENT}/payments/${id}`);
    },
    
    create: async (paymentData) => {
        return apiRequest(`${API_CONFIG.PAYMENT}/payments`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    },
    
    complete: async (id) => {
        return apiRequest(`${API_CONFIG.PAYMENT}/payments/${id}/complete`, {
            method: 'PUT'
        });
    },
    
    refund: async (id) => {
        return apiRequest(`${API_CONFIG.PAYMENT}/payments/${id}/refund`, {
            method: 'PUT'
        });
    }
};

// Report API
const reportAPI = {
    getRevenue: async (startDate, endDate) => {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
        return apiRequest(`${API_CONFIG.REPORT}/reports/revenue?${params}`);
    },
    
    getBookings: async (startDate, endDate) => {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
        return apiRequest(`${API_CONFIG.REPORT}/reports/bookings?${params}`);
    },
    
    getRooms: async () => {
        return apiRequest(`${API_CONFIG.REPORT}/reports/rooms`);
    },
    
    getDashboard: async () => {
        return apiRequest(`${API_CONFIG.REPORT}/reports/dashboard`);
    }
};

