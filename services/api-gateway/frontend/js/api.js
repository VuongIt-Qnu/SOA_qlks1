// API Configuration - All requests go through API Gateway
const API_GATEWAY_URL = 'http://localhost:8000';

const API_CONFIG = {
    GATEWAY: API_GATEWAY_URL,
    AUTH: `${API_GATEWAY_URL}/api/auth`,
    CUSTOMER: `${API_GATEWAY_URL}/api/customers`,
    ROOM: `${API_GATEWAY_URL}/api/rooms`,
    BOOKING: `${API_GATEWAY_URL}/api/bookings`,
    PAYMENT: `${API_GATEWAY_URL}/api/payments`,
    REPORT: `${API_GATEWAY_URL}/api/reports`
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
        // Debug: Log token status
        if (token) {
            console.log('API Request with token:', url.substring(0, 80));
            console.log('Token preview:', token.substring(0, 30) + '...');
            console.log('Authorization header:', config.headers['Authorization'] ? 'Present' : 'Missing');
        } else {
            console.warn('API Request WITHOUT token:', url);
            console.warn('localStorage.getItem("auth_token"):', localStorage.getItem('auth_token'));
        }
        
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
  // ✅ Case 401: im lặng, chỉ logout + redirect, không hiển thị message
        if (response.status === 401) {
            removeToken();

            // nếu bạn muốn: tránh redirect loop khi đang ở trang login/register
            const path = window.location.pathname.toLowerCase();
            const isAuthPage = path.includes("login") || path.includes("register");

            if (!isAuthPage) {
            window.location.replace("/login.html");
            }

            // Throw lỗi "câm" để chặn flow, UI không có message để render
            const error = new Error("");       // hoặc new Error("UNAUTHORIZED")
            error.status = 401;
            error.data = data;
            throw error;
        }

        // Các lỗi khác giữ nguyên như bạn đang làm (dịch VN vẫn ok)
        let errorMsg = data.detail || data.message || data.error || `HTTP error! status: ${response.status}`;

        if (response.status === 403) {
            errorMsg = 'Bạn không có quyền truy cập tài nguyên này.';
        } else if (response.status === 404) {
            errorMsg = 'Không tìm thấy tài nguyên.';
        } else if (response.status === 500) {
            errorMsg = 'Lỗi server. Vui lòng thử lại sau.';
        } else if (response.status === 503) {
            errorMsg = 'Service không khả dụng. Vui lòng thử lại sau.';
        }

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

// Customer API - Routes through API Gateway: /api/customers/*
// Note: API_CONFIG.CUSTOMER already includes /api/customers, so we don't need to add /customers again
const customerAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        // API_CONFIG.CUSTOMER is already /api/customers, so just add query params
        return apiRequest(`${API_CONFIG.CUSTOMER}${params ? '?' + params : ''}`);
    },
    
    getById: async (id) => {
        // API_CONFIG.CUSTOMER is already /api/customers, so just add /{id}
        return apiRequest(`${API_CONFIG.CUSTOMER}/${id}`);
    },
    
    create: async (customerData) => {
        // API_CONFIG.CUSTOMER is already /api/customers, endpoint is /api/customers (POST)
        return apiRequest(`${API_CONFIG.CUSTOMER}`, {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    },
    
    update: async (id, customerData) => {
        // API_CONFIG.CUSTOMER is already /api/customers, so just add /{id}
        return apiRequest(`${API_CONFIG.CUSTOMER}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
    },
    
    delete: async (id) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/${id}`, {
            method: 'DELETE'
        });
    },
    
    getWithHistory: async (id) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/${id}/with-history`);
    },
    
    getProfile: async (id) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/${id}/profile`);
    },
    
    createProfile: async (id, profileData) => {
        return apiRequest(`${API_CONFIG.CUSTOMER}/${id}/profile`, {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }
};

// Room API - Routes through API Gateway: /api/rooms/*
// Note: API_CONFIG.ROOM already includes /api/rooms, so we don't need to add /rooms again
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
    
    updateRoomType: async (id, roomTypeData) => {
        return apiRequest(`${API_CONFIG.ROOM}/room-types/${id}`, {
            method: 'PUT',
            body: JSON.stringify(roomTypeData)
        });
    },
    
    getRooms: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        // API_CONFIG.ROOM is already /api/rooms, so just add query params
        return apiRequest(`${API_CONFIG.ROOM}${params ? '?' + params : ''}`);
    },
    
    getRoomById: async (id) => {
        // API_CONFIG.ROOM is already /api/rooms, so just add /{id}
        return apiRequest(`${API_CONFIG.ROOM}/${id}`);
    },
    
    createRoom: async (roomData) => {
        // API_CONFIG.ROOM is already /api/rooms, endpoint is /api/rooms (POST)
        return apiRequest(`${API_CONFIG.ROOM}`, {
            method: 'POST',
            body: JSON.stringify(roomData)
        });
    },
    
    updateRoom: async (id, roomData) => {
        // API_CONFIG.ROOM is already /api/rooms, so just add /{id}
        return apiRequest(`${API_CONFIG.ROOM}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(roomData)
        });
    },
    
    deleteRoom: async (id) => {
        return apiRequest(`${API_CONFIG.ROOM}/${id}`, {
            method: 'DELETE'
        });
    },
    
    updateRoomStatus: async (id, newStatus) => {
        return apiRequest(`${API_CONFIG.ROOM}/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ new_status: newStatus })
        });
    },
    
    getAvailableRooms: async (checkIn, checkOut, roomTypeId = null) => {
        const params = new URLSearchParams({
            check_in: checkIn,
            check_out: checkOut
        });
        if (roomTypeId) {
            params.append('room_type_id', roomTypeId);
        }
        return apiRequest(`${API_CONFIG.ROOM}/available?${params.toString()}`);
    },
    
    checkRoomAvailability: async (roomId, checkIn, checkOut) => {
        const params = new URLSearchParams({
            check_in: checkIn,
            check_out: checkOut
        });
        return apiRequest(`${API_CONFIG.ROOM}/${roomId}/availability?${params.toString()}`);
    }
};

// Booking API - Routes through API Gateway: /api/bookings/*
// Note: API_CONFIG.BOOKING already includes /api/bookings, so we don't need to add /bookings again
const bookingAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        // API_CONFIG.BOOKING is already /api/bookings, so just add query params
        return apiRequest(`${API_CONFIG.BOOKING}${params ? '?' + params : ''}`);
    },
    
    getById: async (id) => {
        // API_CONFIG.BOOKING is already /api/bookings, so just add /{id}
        return apiRequest(`${API_CONFIG.BOOKING}/${id}`);
    },
    
    create: async (bookingData) => {
        // API_CONFIG.BOOKING is already /api/bookings, endpoint is /api/bookings (POST)
        return apiRequest(`${API_CONFIG.BOOKING}`, {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    },
    
    update: async (id, bookingData) => {
        // API_CONFIG.BOOKING is already /api/bookings, so just add /{id}
        return apiRequest(`${API_CONFIG.BOOKING}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(bookingData)
        });
    },
    
    cancel: async (id) => {
        return apiRequest(`${API_CONFIG.BOOKING}/${id}/cancel`, {
            method: 'PUT'
        });
    },
    
    delete: async (id) => {
        return apiRequest(`${API_CONFIG.BOOKING}/${id}`, {
            method: 'DELETE'
        });
    },
    
    checkIn: async (id) => {
        return apiRequest(`${API_CONFIG.BOOKING}/${id}/check-in`, {
            method: 'PUT'
        });
    },
    
    checkOut: async (id) => {
        return apiRequest(`${API_CONFIG.BOOKING}/${id}/check-out`, {
            method: 'PUT'
        });
    },
    
    getAvailableRooms: async (checkIn, checkOut, roomTypeId = null) => {
        const params = new URLSearchParams({
            check_in: checkIn,
            check_out: checkOut
        });
        if (roomTypeId) {
            params.append('room_type_id', roomTypeId);
        }
        return apiRequest(`${API_CONFIG.BOOKING}/available-rooms?${params.toString()}`);
    },
    
    addDetail: async (bookingId, detailData) => {
        return apiRequest(`${API_CONFIG.BOOKING}/${bookingId}/details`, {
            method: 'POST',
            body: JSON.stringify(detailData)
        });
    },
    
    getDetails: async (bookingId) => {
        return apiRequest(`${API_CONFIG.BOOKING}/${bookingId}/details`);
    }
};

// Payment API - Routes through API Gateway: /api/payments/*
// Note: API_CONFIG.PAYMENT already includes /api/payments, so we don't need to add /payments again
const paymentAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        // API_CONFIG.PAYMENT is already /api/payments, so just add query params
        return apiRequest(`${API_CONFIG.PAYMENT}${params ? '?' + params : ''}`);
    },
    
    getById: async (id) => {
        // API_CONFIG.PAYMENT is already /api/payments, so just add /{id}
        return apiRequest(`${API_CONFIG.PAYMENT}/${id}`);
    },
    
    create: async (paymentData) => {
        // API_CONFIG.PAYMENT is already /api/payments, endpoint is /api/payments (POST)
        return apiRequest(`${API_CONFIG.PAYMENT}`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    },
    
    complete: async (id) => {
        return apiRequest(`${API_CONFIG.PAYMENT}/${id}/complete`, {
            method: 'PUT'
        });
    },
    
    refund: async (id) => {
        return apiRequest(`${API_CONFIG.PAYMENT}/${id}/refund`, {
            method: 'PUT'
        });
    },
    
    getTransactionHistory: async (customerId = null, startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (customerId) params.append('customer_id', customerId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return apiRequest(`${API_CONFIG.PAYMENT}/transaction-history?${params.toString()}`);
    },
    
    getInvoices: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return apiRequest(`${API_CONFIG.PAYMENT}/invoices${params ? '?' + params : ''}`);
    },
    
    getInvoice: async (id) => {
        return apiRequest(`${API_CONFIG.PAYMENT}/invoices/${id}`);
    }
};

// Report API - Routes through API Gateway: /api/reports/*
// Note: API_CONFIG.REPORT already includes /api/reports, and backend endpoints are /reports/...
// So we need to add /reports/ prefix for report endpoints
const reportAPI = {
    getRevenue: async (startDate, endDate, period = 'month') => {
        const params = new URLSearchParams({ 
            start_date: startDate, 
            end_date: endDate,
            period: period
        }).toString();
        return apiRequest(`${API_CONFIG.REPORT}/revenue?${params}`);
    },
    
    getRevenueDaily: async (startDate, endDate) => {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
        return apiRequest(`${API_CONFIG.REPORT}/revenue/daily?${params}`);
    },
    
    getRevenueMonthly: async (startDate, endDate) => {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
        return apiRequest(`${API_CONFIG.REPORT}/revenue/monthly?${params}`);
    },
    
    getRevenueYearly: async (startDate, endDate) => {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
        return apiRequest(`${API_CONFIG.REPORT}/revenue/yearly?${params}`);
    },
    
    getBookings: async (startDate = null, endDate = null) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const queryString = params.toString();
        return apiRequest(`${API_CONFIG.REPORT}/bookings${queryString ? '?' + queryString : ''}`);
    },
    
    getRooms: async () => {
        return apiRequest(`${API_CONFIG.REPORT}/rooms`);
    },
    
    getOccupancyRate: async (startDate, endDate) => {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
        return apiRequest(`${API_CONFIG.REPORT}/occupancy-rate?${params}`);
    },
    
    getDashboard: async () => {
        return apiRequest(`${API_CONFIG.REPORT}/dashboard`);
    }
};


