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

// -----------------------------
// Token helpers (safe override)
// -----------------------------
function getToken() {
  // ưu tiên hàm từ jwt-utils nếu có
  if (typeof window.getToken === "function" && window.getToken !== getToken) {
    try { return window.getToken(); } catch (_) {}
  }
  return localStorage.getItem('auth_token');
}

function setToken(token) {
  if (typeof window.setToken === "function" && window.setToken !== setToken) {
    try { return window.setToken(token); } catch (_) {}
  }
  localStorage.setItem('auth_token', token);
}

function removeToken() {
  if (typeof window.removeToken === "function" && window.removeToken !== removeToken) {
    try { return window.removeToken(); } catch (_) {}
  }
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
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Unexpected response format: ${text}`);
    }

    if (!response.ok) {
      // ✅ Case 401: silent logout + redirect (avoid loop on auth pages)
      if (response.status === 401) {
        removeToken();

        const path = (window.location.pathname || "").toLowerCase();
        const isAuthPage = path.includes("login") || path.includes("register");
        if (!isAuthPage) {
          window.location.replace("/login.html");
        }

        const error = new Error("");
        error.status = 401;
        error.data = data;
        throw error;
      }

      // Other errors
      let errorMsg = data.detail || data.message || data.error || `HTTP error! status: ${response.status}`;
      if (response.status === 403) errorMsg = 'Bạn không có quyền truy cập tài nguyên này.';
      if (response.status === 404) errorMsg = 'Không tìm thấy tài nguyên.';
      if (response.status === 500) errorMsg = 'Lỗi server. Vui lòng thử lại sau.';
      if (response.status === 503) errorMsg = 'Service không khả dụng. Vui lòng thử lại sau.';

      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Helpful error message on network fail
    if (error && error.message === 'Failed to fetch') {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra API Gateway đã chạy chưa (http://localhost:8000)');
    }
    throw error;
  }
}

// -----------------------------
// APIs
// -----------------------------
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

  getMe: async () => apiRequest(`${API_CONFIG.AUTH}/me`),

  updateMe: async (userData) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    let userId = null;

    // ưu tiên decodeJWT nếu có
    if (typeof window.decodeJWT === 'function') {
      const payload = window.decodeJWT(token);
      userId = payload?.sub;
    } else {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    if (!userId) throw new Error('User ID not found in token');

    return apiRequest(`${API_CONFIG.AUTH}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }
};

const customerAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`${API_CONFIG.CUSTOMER}${params ? '?' + params : ''}`);
  },
  getById: async (id) => apiRequest(`${API_CONFIG.CUSTOMER}/${id}`),
  create: async (customerData) => apiRequest(`${API_CONFIG.CUSTOMER}`, { method: 'POST', body: JSON.stringify(customerData) }),
  update: async (id, customerData) => apiRequest(`${API_CONFIG.CUSTOMER}/${id}`, { method: 'PUT', body: JSON.stringify(customerData) }),
  delete: async (id) => apiRequest(`${API_CONFIG.CUSTOMER}/${id}`, { method: 'DELETE' }),
  getWithHistory: async (id) => apiRequest(`${API_CONFIG.CUSTOMER}/${id}/with-history`),
  getProfile: async (id) => apiRequest(`${API_CONFIG.CUSTOMER}/${id}/profile`),
  createProfile: async (id, profileData) => apiRequest(`${API_CONFIG.CUSTOMER}/${id}/profile`, { method: 'POST', body: JSON.stringify(profileData) })
};

const roomAPI = {
<<<<<<< HEAD
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
=======
  getRoomTypes: async () => apiRequest(`${API_CONFIG.ROOM}/room-types`),
  createRoomType: async (roomTypeData) => apiRequest(`${API_CONFIG.ROOM}/room-types`, { method: 'POST', body: JSON.stringify(roomTypeData) }),
  getRooms: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`${API_CONFIG.ROOM}${params ? '?' + params : ''}`);
  },
  getRoomById: async (id) => apiRequest(`${API_CONFIG.ROOM}/${id}`),
  createRoom: async (roomData) => apiRequest(`${API_CONFIG.ROOM}`, { method: 'POST', body: JSON.stringify(roomData) }),
  updateRoom: async (id, roomData) => apiRequest(`${API_CONFIG.ROOM}/${id}`, { method: 'PUT', body: JSON.stringify(roomData) }),
  deleteRoom: async (id) => apiRequest(`${API_CONFIG.ROOM}/${id}`, { method: 'DELETE' }),
  updateRoomStatus: async (id, newStatus) => apiRequest(`${API_CONFIG.ROOM}/${id}/status`, { method: 'PUT', body: JSON.stringify({ new_status: newStatus }) }),
  getAvailableRooms: async (checkIn, checkOut, roomTypeId = null) => {
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
    if (roomTypeId) params.append('room_type_id', roomTypeId);
    return apiRequest(`${API_CONFIG.ROOM}/available?${params.toString()}`);
  },
  checkRoomAvailability: async (roomId, checkIn, checkOut) => {
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
    return apiRequest(`${API_CONFIG.ROOM}/${roomId}/availability?${params.toString()}`);
  }
>>>>>>> 88ea35c (update)
};

const bookingAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`${API_CONFIG.BOOKING}${params ? '?' + params : ''}`);
  },
  getById: async (id) => apiRequest(`${API_CONFIG.BOOKING}/${id}`),
  create: async (bookingData) => apiRequest(`${API_CONFIG.BOOKING}`, { method: 'POST', body: JSON.stringify(bookingData) }),
  update: async (id, bookingData) => apiRequest(`${API_CONFIG.BOOKING}/${id}`, { method: 'PUT', body: JSON.stringify(bookingData) }),
  cancel: async (id) => apiRequest(`${API_CONFIG.BOOKING}/${id}/cancel`, { method: 'PUT' }),
  delete: async (id) => apiRequest(`${API_CONFIG.BOOKING}/${id}`, { method: 'DELETE' }),
  checkIn: async (id) => apiRequest(`${API_CONFIG.BOOKING}/${id}/check-in`, { method: 'PUT' }),
  checkOut: async (id) => apiRequest(`${API_CONFIG.BOOKING}/${id}/check-out`, { method: 'PUT' }),
  getAvailableRooms: async (checkIn, checkOut, roomTypeId = null) => {
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
    if (roomTypeId) params.append('room_type_id', roomTypeId);
    return apiRequest(`${API_CONFIG.BOOKING}/available-rooms?${params.toString()}`);
  },
  addDetail: async (bookingId, detailData) => apiRequest(`${API_CONFIG.BOOKING}/${bookingId}/details`, { method: 'POST', body: JSON.stringify(detailData) }),
  getDetails: async (bookingId) => apiRequest(`${API_CONFIG.BOOKING}/${bookingId}/details`)
};

const paymentAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`${API_CONFIG.PAYMENT}${params ? '?' + params : ''}`);
  },
  getById: async (id) => apiRequest(`${API_CONFIG.PAYMENT}/${id}`),
  create: async (paymentData) => apiRequest(`${API_CONFIG.PAYMENT}`, { method: 'POST', body: JSON.stringify(paymentData) }),
  complete: async (id) => apiRequest(`${API_CONFIG.PAYMENT}/${id}/complete`, { method: 'PUT' }),
  refund: async (id) => apiRequest(`${API_CONFIG.PAYMENT}/${id}/refund`, { method: 'PUT' }),
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
  getInvoice: async (id) => apiRequest(`${API_CONFIG.PAYMENT}/invoices/${id}`)
};

const reportAPI = {
  getRevenue: async (startDate, endDate, period = 'month') => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate, period }).toString();
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
    const qs = params.toString();
    return apiRequest(`${API_CONFIG.REPORT}/bookings${qs ? '?' + qs : ''}`);
  },
  getRooms: async () => apiRequest(`${API_CONFIG.REPORT}/rooms`),
  getOccupancyRate: async (startDate, endDate) => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
    return apiRequest(`${API_CONFIG.REPORT}/occupancy-rate?${params}`);
  },
  getDashboard: async () => apiRequest(`${API_CONFIG.REPORT}/dashboard`)
};

<<<<<<< HEAD

=======
// -----------------------------
// ✅ IMPORTANT: expose to window
// -----------------------------
window.API_CONFIG = API_CONFIG;

window.apiRequest = apiRequest;

window.getToken = window.getToken || getToken;
window.setToken = window.setToken || setToken;
window.removeToken = window.removeToken || removeToken;

// ✅ Fix cốt lõi: authAPI/register/login luôn có trên window
window.authAPI = authAPI;
window.customerAPI = customerAPI;
window.roomAPI = roomAPI;
window.bookingAPI = bookingAPI;
window.paymentAPI = paymentAPI;
window.reportAPI = reportAPI;

console.log("[api.js] APIs ready:", {
  authAPI: !!window.authAPI,
  register: typeof window.authAPI?.register,
  login: typeof window.authAPI?.login
});
>>>>>>> 88ea35c (update)
