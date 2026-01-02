// API Configuration - All requests go through API Gateway
const API_GATEWAY_URL = 'http://localhost:8000';

const API_CONFIG = {
    GATEWAY: API_GATEWAY_URL,
    AUTH: `${API_GATEWAY_URL}/auth`,
    CUSTOMER: `${API_GATEWAY_URL}/customers`,
    ROOM: `${API_GATEWAY_URL}/rooms`,
    BOOKING: `${API_GATEWAY_URL}/bookings`,
    PAYMENT: `${API_GATEWAY_URL}/payments`,
    REPORT: `${API_GATEWAY_URL}/reports`
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
        console.log('API Request:', url, config); // Debug log
        const response = await fetch(url, config);
        
        // Check if response is JSON
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error(`Unexpected response format: ${text}`);
        }
        
        if (!response.ok) {
            // Extract error message from response
            const errorMsg = data.detail || data.message || data.error || `HTTP error! status: ${response.status}`;
            const error = new Error(errorMsg);
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        console.error('URL:', url);
        console.error('Config:', config);
        
        // Provide more helpful error message
        if (error.message === 'Failed to fetch') {
            throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra API Gateway đã chạy chưa (http://localhost:8000)');
        }
        
        throw error;
    }
}

// Auth API - Routes through API Gateway: /auth/*
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

// Customer API - Routes through API Gateway: /customers/*
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

// Room API - Routes through API Gateway: /rooms/*
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

// Booking API - Routes through API Gateway: /bookings/*
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

// Payment API - Routes through API Gateway: /payments/*
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

// Report API - Routes through API Gateway: /reports/*
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

