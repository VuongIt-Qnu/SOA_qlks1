// Room Detail Page JavaScript

// Import helper functions
function getToken() {
    return localStorage.getItem('auth_token');
}

function removeToken() {
    localStorage.removeItem('auth_token');
}

// Global variables
let currentRoom = null;
let currentRoomType = null;
let currentImages = [];
let currentImageIndex = 0;
let currentBooking = null;

// Room images mapping (same as in user.js)
const ROOM_IMAGES = {
    'Standard': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
    'Deluxe': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    'Superior': 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
    'Family': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'Suite': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    'VIP': 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800',
    default: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id') || urlParams.get('room_id');
    const roomTypeId = urlParams.get('type_id') || urlParams.get('room_type_id');
    
    if (roomId) {
        await loadRoomDetail(roomId);
    } else if (roomTypeId) {
        await loadRoomTypeDetail(roomTypeId);
    } else {
        showError('Không tìm thấy thông tin phòng');
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup auth UI
    setupAuthUI();
});

// Setup authentication UI
function setupAuthUI() {
    const token = getToken();
    const loginBtn = document.getElementById('userLoginBtn');
    const logoutBtn = document.getElementById('userLogoutBtn');
    
    if (token) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/login.html';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            removeToken();
            window.currentUser = null;
            window.location.href = '/login.html';
        });
    }
}

// Load room detail by room ID
async function loadRoomDetail(roomId) {
    try {
        showLoading();
        
        // Wait for API to be ready
        if (!window.roomAPI) {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (!window.roomAPI) {
                throw new Error('API chưa sẵn sàng');
            }
        }
        
        const room = await window.roomAPI.getRoomById(roomId);
        if (!room) {
            throw new Error('Không tìm thấy phòng');
        }
        
        // Get room type
        const roomTypes = await window.roomAPI.getRoomTypes();
        currentRoomType = roomTypes.find(rt => rt.id === room.room_type_id);
        
        currentRoom = room;
        await renderRoomDetail(room, currentRoomType);
        
        // Check for existing booking
        await checkExistingBooking(roomId);
        
    } catch (error) {
        console.error('Error loading room detail:', error);
        showError(error.message || 'Không thể tải thông tin phòng');
    } finally {
        hideLoading();
    }
}

// Load room type detail (when clicking from room list)
async function loadRoomTypeDetail(roomTypeId) {
    try {
        showLoading();
        
        // Wait for API to be ready
        if (!window.roomAPI) {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (!window.roomAPI) {
                throw new Error('API chưa sẵn sàng');
            }
        }
        
        const roomTypes = await window.roomAPI.getRoomTypes();
        const roomType = roomTypes.find(rt => rt.id === parseInt(roomTypeId));
        
        if (!roomType) {
            throw new Error('Không tìm thấy loại phòng');
        }
        
        // Get first available room of this type
        const rooms = await window.roomAPI.getRooms({ room_type_id: roomTypeId, status: 'available' });
        
        if (rooms.length === 0) {
            // Show room type info even if no rooms available
            currentRoomType = roomType;
            await renderRoomTypeDetail(roomType);
        } else {
            currentRoom = rooms[0];
            currentRoomType = roomType;
            await renderRoomDetail(rooms[0], roomType);
        }
        
    } catch (error) {
        console.error('Error loading room type detail:', error);
        showError(error.message || 'Không thể tải thông tin phòng');
    } finally {
        hideLoading();
    }
}

// Render room detail
async function renderRoomDetail(room, roomType) {
    if (!room || !roomType) return;
    
    // Set images
    setupImages(roomType);
    
    // Basic info
    document.getElementById('roomId').textContent = room.id || '-';
    document.getElementById('roomName').textContent = roomType.name || 'Room';
    document.getElementById('breadcrumbRoomName').textContent = roomType.name || 'Room';
    document.getElementById('roomTypeBadge').textContent = roomType.name || 'Standard';
    document.getElementById('roomTypeName').textContent = roomType.name || '-';
    document.getElementById('roomNumber').textContent = room.room_number || '-';
    document.getElementById('roomFloor').textContent = room.floor ? `Tầng ${room.floor}` : '-';
    document.getElementById('roomStatus').innerHTML = getStatusBadge(room.status || 'available');
    
    // Room type info
    document.getElementById('roomMaxOccupancy').textContent = `${roomType.max_occupancy || 2} người`;
    document.getElementById('roomPrice').textContent = formatCurrency(roomType.price_per_night || 0);
    document.getElementById('bookingPrice').textContent = formatCurrency(roomType.price_per_night || 0);
    document.getElementById('roomDescription').textContent = roomType.description || 'Phòng đẹp và tiện nghi.';
    
    // Set default values
    document.getElementById('roomGrade').textContent = getRoomGrade(roomType.name);
    document.getElementById('roomArea').textContent = getRoomArea(roomType.name);
    document.getElementById('roomView').textContent = getRoomView(roomType.name);
    document.getElementById('roomSmoking').textContent = 'Không';
    
    // Rating
    const rating = 4.5; // Default rating
    document.getElementById('roomRating').textContent = rating.toFixed(1);
    
    // Amenities
    renderAmenities(roomType);
    
    // Bed configuration
    renderBedConfig(roomType);
    
    // Policies
    renderPolicies();
    
    // Setup booking form
    setupBookingForm(roomType);
    
    // Update price breakdown
    updatePriceBreakdown();
    
    // Show content
    document.getElementById('roomDetailContent').style.display = 'block';
}

// Render room type detail (when no specific room)
async function renderRoomTypeDetail(roomType) {
    setupImages(roomType);
    
    document.getElementById('roomId').textContent = '-';
    document.getElementById('roomName').textContent = roomType.name || 'Room';
    document.getElementById('breadcrumbRoomName').textContent = roomType.name || 'Room';
    document.getElementById('roomTypeBadge').textContent = roomType.name || 'Standard';
    document.getElementById('roomTypeName').textContent = roomType.name || '-';
    document.getElementById('roomNumber').textContent = 'Nhiều phòng';
    document.getElementById('roomFloor').textContent = 'Nhiều tầng';
    document.getElementById('roomStatus').innerHTML = '<span class="status-badge status-available">Available</span>';
    
    document.getElementById('roomMaxOccupancy').textContent = `${roomType.max_occupancy || 2} người`;
    document.getElementById('roomPrice').textContent = formatCurrency(roomType.price_per_night || 0);
    document.getElementById('bookingPrice').textContent = formatCurrency(roomType.price_per_night || 0);
    document.getElementById('roomDescription').textContent = roomType.description || 'Phòng đẹp và tiện nghi.';
    
    document.getElementById('roomGrade').textContent = getRoomGrade(roomType.name);
    document.getElementById('roomArea').textContent = getRoomArea(roomType.name);
    document.getElementById('roomView').textContent = getRoomView(roomType.name);
    document.getElementById('roomSmoking').textContent = 'Không';
    
    const rating = 4.5;
    document.getElementById('roomRating').textContent = rating.toFixed(1);
    
    renderAmenities(roomType);
    renderBedConfig(roomType);
    renderPolicies();
    setupBookingForm(roomType);
    updatePriceBreakdown();
    
    document.getElementById('roomDetailContent').style.display = 'block';
}

// Setup images
function setupImages(roomType) {
    const mainImage = getRoomImageUrl(roomType.name);
    const bedImage = mainImage; // Can be different
    const bathroomImage = mainImage; // Can be different
    const balconyImage = mainImage; // Can be different
    
    currentImages = [
        { url: mainImage, title: 'Tổng thể phòng' },
        { url: bedImage, title: 'Giường' },
        { url: bathroomImage, title: 'Phòng tắm' },
        { url: balconyImage, title: 'Ban công / View' }
    ];
    
    currentImageIndex = 0;
    renderImageGallery();
}

// Render image gallery
function renderImageGallery() {
    const mainImg = document.getElementById('mainRoomImage');
    const thumbnails = document.getElementById('galleryThumbnails');
    const currentIndex = document.getElementById('currentImageIndex');
    const totalImages = document.getElementById('totalImages');
    
    if (currentImages.length > 0) {
        mainImg.src = currentImages[0].url;
        mainImg.alt = currentImages[0].title;
        
        totalImages.textContent = currentImages.length;
        currentIndex.textContent = currentImageIndex + 1;
        
        thumbnails.innerHTML = currentImages.map((img, index) => `
            <div class="thumbnail-item ${index === currentImageIndex ? 'active' : ''}" 
                 onclick="selectImage(${index})">
                <img src="${img.url}" alt="${img.title}">
            </div>
        `).join('');
    }
}

// Change main image
function changeMainImage(direction) {
    currentImageIndex = (currentImageIndex + direction + currentImages.length) % currentImages.length;
    const mainImg = document.getElementById('mainRoomImage');
    mainImg.src = currentImages[currentImageIndex].url;
    mainImg.alt = currentImages[currentImageIndex].title;
    
    document.getElementById('currentImageIndex').textContent = currentImageIndex + 1;
    
    // Update thumbnails
    document.querySelectorAll('.thumbnail-item').forEach((item, index) => {
        item.classList.toggle('active', index === currentImageIndex);
    });
}

// Select image
function selectImage(index) {
    currentImageIndex = index;
    const mainImg = document.getElementById('mainRoomImage');
    mainImg.src = currentImages[index].url;
    mainImg.alt = currentImages[index].title;
    
    document.getElementById('currentImageIndex').textContent = currentImageIndex + 1;
    
    document.querySelectorAll('.thumbnail-item').forEach((item, i) => {
        item.classList.toggle('active', i === currentImageIndex);
    });
}

// Get room image URL
function getRoomImageUrl(roomTypeName) {
    return ROOM_IMAGES[roomTypeName] || ROOM_IMAGES.default;
}

// Render amenities
function renderAmenities(roomType) {
    const amenities = [
        { icon: 'wifi', name: 'Wi-Fi miễn phí', available: true },
        { icon: 'snowflake', name: 'Điều hòa', available: true },
        { icon: 'tv', name: 'TV', available: true },
        { icon: 'wine-bottle', name: 'Mini bar', available: true },
        { icon: 'coffee', name: 'Ấm đun nước', available: true },
        { icon: 'lock', name: 'Két sắt', available: true },
        { icon: 'soap', name: 'Khăn tắm / đồ vệ sinh', available: true },
        { icon: 'shower', name: 'Phòng tắm riêng', available: true },
        { icon: 'wind', name: 'Máy sấy tóc', available: true },
        { icon: 'broom', name: 'Dọn phòng hằng ngày', available: true }
    ];
    
    const grid = document.getElementById('amenitiesGrid');
    grid.innerHTML = amenities.map(amenity => `
        <div class="amenity-item ${amenity.available ? '' : 'unavailable'}">
            <i class="fas fa-${amenity.icon}"></i>
            <span>${amenity.name}</span>
        </div>
    `).join('');
}

// Render bed configuration
function renderBedConfig(roomType) {
    const bedType = getBedType(roomType.name);
    const bedCount = getBedCount(roomType.name);
    
    const config = [
        { icon: 'bed', label: 'Loại giường', value: bedType },
        { icon: 'bed', label: 'Số giường', value: bedCount },
        { icon: 'couch', label: 'Sofa / Bàn làm việc', value: 'Có' },
        { icon: 'door-open', label: 'Ban công', value: 'Có' }
    ];
    
    const grid = document.getElementById('bedInfoGrid');
    grid.innerHTML = config.map(item => `
        <div class="bed-info-item">
            <i class="fas fa-${item.icon}"></i>
            <div>
                <span class="bed-label">${item.label}</span>
                <span class="bed-value">${item.value}</span>
            </div>
        </div>
    `).join('');
}

// Render policies
function renderPolicies() {
    const policies = [
        { icon: 'clock', label: 'Giờ check-in', value: '14:00' },
        { icon: 'clock', label: 'Giờ check-out', value: '12:00' },
        { icon: 'ban', label: 'Chính sách hủy', value: 'Miễn phí trước 24h' },
        { icon: 'credit-card', label: 'Thanh toán', value: 'Thanh toán khi nhận phòng' },
        { icon: 'dog', label: 'Thú cưng', value: 'Không cho phép' },
        { icon: 'baby', label: 'Trẻ em / Giường phụ', value: 'Có thể thêm giường phụ' }
    ];
    
    const list = document.getElementById('policiesList');
    list.innerHTML = policies.map(policy => `
        <div class="policy-item">
            <i class="fas fa-${policy.icon}"></i>
            <div>
                <span class="policy-label">${policy.label}</span>
                <span class="policy-value">${policy.value}</span>
            </div>
        </div>
    `).join('');
}

// Setup booking form
function setupBookingForm(roomType) {
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');
    const guestsSelect = document.getElementById('guestsCount');
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    checkInInput.min = today;
    checkOutInput.min = today;
    
    // Set default dates
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    checkInInput.value = tomorrow;
    checkOutInput.value = dayAfter;
    
    // Setup guests options
    const maxGuests = roomType.max_occupancy || 4;
    guestsSelect.innerHTML = '';
    for (let i = 1; i <= maxGuests; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} khách${i > 1 ? '' : ''}`;
        if (i === Math.min(2, maxGuests)) option.selected = true;
        guestsSelect.appendChild(option);
    }
    
    // Update check-out min date when check-in changes
    checkInInput.addEventListener('change', () => {
        const checkInDate = new Date(checkInInput.value);
        checkInDate.setDate(checkInDate.getDate() + 1);
        checkOutInput.min = checkInDate.toISOString().split('T')[0];
        if (checkOutInput.value <= checkInInput.value) {
            checkOutInput.value = checkInDate.toISOString().split('T')[0];
        }
        updatePriceBreakdown();
    });
    
    checkOutInput.addEventListener('change', () => {
        updatePriceBreakdown();
    });
    
    guestsSelect.addEventListener('change', () => {
        const selected = parseInt(guestsSelect.value);
        if (selected > maxGuests) {
            guestsSelect.value = maxGuests;
            showToast(`Tối đa ${maxGuests} khách`, 'warning');
        }
    });
}

// Update price breakdown
function updatePriceBreakdown() {
    const checkIn = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;
    
    if (!checkIn || !checkOut || !currentRoomType) return;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
    
    const pricePerNight = currentRoomType.price_per_night || 0;
    const subtotal = pricePerNight * nights;
    const tax = subtotal * 0.1; // 10% tax
    const serviceFee = 0; // No service fee
    const total = subtotal + tax + serviceFee;
    
    document.getElementById('pricePerNight').textContent = formatCurrency(pricePerNight);
    document.getElementById('nightsCount').textContent = `${nights} đêm`;
    document.getElementById('taxAmount').textContent = formatCurrency(tax);
    document.getElementById('serviceFee').textContent = formatCurrency(serviceFee);
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

// Check existing booking
async function checkExistingBooking(roomId) {
    try {
        const token = getToken();
        if (!token) return;
        
        // Get current user to find customer
        if (!window.currentUser) {
            try {
                window.currentUser = await window.authAPI.getMe();
            } catch (error) {
                console.error('Failed to load user:', error);
                return;
            }
        }
        
        // Get or create customer
        let customer;
        try {
            const userEmail = window.currentUser.email;
            let customers = await window.customerAPI.getAll();
            customer = Array.isArray(customers) 
                ? customers.find(c => c.email && c.email.toLowerCase() === userEmail.toLowerCase())
                : null;
        } catch (error) {
            console.error('Failed to get customer:', error);
            return;
        }
        
        if (!customer || !customer.id) {
            return; // No customer yet, so no bookings
        }
        
        // Get bookings for this customer
        const bookings = await window.bookingAPI.getAll({ customer_id: customer.id });
        
        // Find active booking for this room
        const booking = bookings.find(b => 
            b.room_id === roomId && 
            (b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in')
        );
        
        if (booking) {
            currentBooking = booking;
            renderExistingBooking(booking);
        }
    } catch (error) {
        console.error('Error checking booking:', error);
        // Don't show error to user, just silently fail
    }
}

// Render existing booking
function renderExistingBooking(booking) {
    const section = document.getElementById('existingBookingSection');
    const card = document.getElementById('existingBookingCard');
    
    // Parse dates safely (handle both string and Date formats)
    let checkInDate, checkOutDate;
    if (typeof booking.check_in === 'string') {
        checkInDate = new Date(booking.check_in);
    } else {
        checkInDate = new Date(booking.check_in);
    }
    
    if (typeof booking.check_out === 'string') {
        checkOutDate = new Date(booking.check_out);
    } else {
        checkOutDate = new Date(booking.check_out);
    }
    
    const checkIn = checkInDate.toLocaleDateString('vi-VN');
    const checkOut = checkOutDate.toLocaleDateString('vi-VN');
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    card.innerHTML = `
        <div class="booking-info-item">
            <i class="fas fa-hashtag"></i>
            <div>
                <span class="booking-label">Booking ID</span>
                <span class="booking-value">#${booking.id}</span>
            </div>
        </div>
        <div class="booking-info-item">
            <i class="fas fa-calendar-check"></i>
            <div>
                <span class="booking-label">Check-in</span>
                <span class="booking-value">${checkIn}</span>
            </div>
        </div>
        <div class="booking-info-item">
            <i class="fas fa-calendar-times"></i>
            <div>
                <span class="booking-label">Check-out</span>
                <span class="booking-value">${checkOut}</span>
            </div>
        </div>
        <div class="booking-info-item">
            <i class="fas fa-moon"></i>
            <div>
                <span class="booking-label">Số đêm</span>
                <span class="booking-value">${nights} đêm</span>
            </div>
        </div>
        <div class="booking-info-item">
            <i class="fas fa-info-circle"></i>
            <div>
                <span class="booking-label">Trạng thái</span>
                <span class="booking-value">${getStatusBadge(booking.status)}</span>
            </div>
        </div>
        <div class="booking-info-item">
            <i class="fas fa-credit-card"></i>
            <div>
                <span class="booking-label">Thanh toán</span>
                <span class="booking-value">${booking.payment_status || 'Chưa thanh toán'}</span>
            </div>
        </div>
    `;
    
    section.style.display = 'block';
    
    // Show action buttons
    if (booking.status === 'pending' || booking.status === 'confirmed') {
        document.getElementById('cancelBookingBtn').style.display = 'inline-flex';
    }
    if (booking.payment_status !== 'paid') {
        document.getElementById('makePaymentBtn').style.display = 'inline-flex';
    }
    document.getElementById('viewBookingBtn').style.display = 'inline-flex';
    document.getElementById('downloadInvoiceBtn').style.display = 'inline-flex';
}

// Setup event listeners
function setupEventListeners() {
    // Booking form submit
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleBooking();
        });
    }
    
    // Action buttons
    const viewBookingBtn = document.getElementById('viewBookingBtn');
    if (viewBookingBtn) {
        viewBookingBtn.addEventListener('click', () => {
            window.location.href = '/user/user.html#myBookings';
        });
    }
    
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener('click', async () => {
            if (confirm('Bạn có chắc muốn hủy booking này?')) {
                await cancelBooking();
            }
        });
    }
    
    const makePaymentBtn = document.getElementById('makePaymentBtn');
    if (makePaymentBtn) {
        makePaymentBtn.addEventListener('click', () => {
            window.location.href = `/user/user.html#myBookings`;
        });
    }
}

// Handle booking
async function handleBooking() {
    const token = getToken();
    if (!token) {
        showToast('Vui lòng đăng nhập để đặt phòng', 'warning');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const checkIn = document.getElementById('checkInDate').value;
        const checkOut = document.getElementById('checkOutDate').value;
        const guests = parseInt(document.getElementById('guestsCount').value);
        
        if (!checkIn || !checkOut) {
            showToast('Vui lòng chọn ngày check-in và check-out', 'error');
            return;
        }
        
        // Validate dates
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);
        
        if (checkInDate < today) {
            showToast('Ngày check-in không thể là ngày quá khứ', 'error');
            return;
        }
        
        if (checkOutDate <= checkInDate) {
            showToast('Ngày check-out phải sau ngày check-in', 'error');
            return;
        }
        
        // Validate minimum stay (at least 1 night)
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights < 1) {
            showToast('Phải đặt ít nhất 1 đêm', 'error');
            return;
        }
        
        // Get available room
        let roomId = null;
        if (currentRoom) {
            roomId = currentRoom.id;
        } else if (currentRoomType) {
            // Get available rooms with date filter and room type filter
            const rooms = await window.roomAPI.getAvailableRooms(checkIn, checkOut, currentRoomType.id);
            if (rooms.length === 0) {
                showToast('Không còn phòng trống trong khoảng thời gian này', 'error');
                return;
            }
            roomId = rooms[0].id;
        }
        
        if (!roomId) {
            showToast('Không tìm thấy phòng phù hợp', 'error');
            return;
        }
        
        // Get or create customer (same function as in user.js)
        let customer;
        try {
            if (!window.currentUser) {
                window.currentUser = await window.authAPI.getMe();
            }
            
            const userEmail = window.currentUser.email;
            let customers = await window.customerAPI.getAll();
            customer = Array.isArray(customers) 
                ? customers.find(c => c.email && c.email.toLowerCase() === userEmail.toLowerCase())
                : null;
            
            if (!customer) {
                const customerData = {
                    name: window.currentUser.full_name || window.currentUser.username,
                    email: userEmail,
                    phone: '0000000000',
                    address: ''
                };
                customer = await window.customerAPI.create(customerData);
            }
        } catch (error) {
            console.error('Error getting/creating customer:', error);
            showToast('Không thể lấy thông tin khách hàng. Vui lòng thử lại.', 'error');
            return;
        }
        
        if (!customer || !customer.id) {
            showToast('Không tìm thấy thông tin khách hàng', 'error');
            return;
        }
        
        // Validate guests count
        if (guests < 1) {
            showToast('Số lượng khách phải ít nhất 1 người', 'error');
            return;
        }
        
        if (currentRoomType && guests > currentRoomType.max_occupancy) {
            showToast(`Số lượng khách không được vượt quá ${currentRoomType.max_occupancy} người`, 'error');
            return;
        }
        
        // Get special requests
        const specialRequestsEl = document.getElementById('specialRequests');
        const specialRequests = specialRequestsEl ? specialRequestsEl.value.trim() : '';
        
        // Create booking
        const bookingData = {
            customer_id: customer.id,
            room_id: roomId,
            check_in: checkIn,
            check_out: checkOut,
            guests: guests,
            special_requests: specialRequests || null
        };
        
        showLoading();
        const booking = await window.bookingAPI.create(bookingData);
        
        showToast('Đặt phòng thành công!', 'success');
        
        // Redirect to bookings page
        setTimeout(() => {
            window.location.href = '/user/user.html#myBookings';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating booking:', error);
        showToast(error.message || 'Không thể đặt phòng. Vui lòng thử lại.', 'error');
    } finally {
        hideLoading();
    }
}

// Cancel booking
async function cancelBooking() {
    if (!currentBooking) return;
    
    try {
        showLoading();
        await window.bookingAPI.cancel(currentBooking.id);
        showToast('Đã hủy booking thành công', 'success');
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('Error canceling booking:', error);
        showToast(error.message || 'Không thể hủy booking', 'error');
    } finally {
        hideLoading();
    }
}

// Helper functions
function getRoomGrade(roomTypeName) {
    const grades = {
        'Standard': 'Tiêu chuẩn',
        'Deluxe': 'Cao cấp',
        'Superior': 'Thượng hạng',
        'Family': 'Gia đình',
        'Suite': 'Suite',
        'VIP': 'VIP'
    };
    return grades[roomTypeName] || 'Tiêu chuẩn';
}

function getRoomArea(roomTypeName) {
    const areas = {
        'Standard': '25 m²',
        'Deluxe': '35 m²',
        'Superior': '40 m²',
        'Family': '50 m²',
        'Suite': '60 m²',
        'VIP': '80 m²'
    };
    return areas[roomTypeName] || '30 m²';
}

function getRoomView(roomTypeName) {
    const views = {
        'Standard': 'City View',
        'Deluxe': 'Garden View',
        'Superior': 'City View',
        'Family': 'Garden View',
        'Suite': 'Sea View',
        'VIP': 'Sea View'
    };
    return views[roomTypeName] || 'City View';
}

function getBedType(roomTypeName) {
    const beds = {
        'Standard': 'Queen',
        'Deluxe': 'King',
        'Superior': 'King',
        'Family': 'King + Single',
        'Suite': 'King',
        'VIP': 'King'
    };
    return beds[roomTypeName] || 'Queen';
}

function getBedCount(roomTypeName) {
    const counts = {
        'Standard': '1 giường',
        'Deluxe': '1 giường',
        'Superior': '1 giường',
        'Family': '2 giường',
        'Suite': '1 giường',
        'VIP': '1 giường'
    };
    return counts[roomTypeName] || '1 giường';
}

function getStatusBadge(status) {
    const badges = {
        'available': '<span class="status-badge status-available">Available</span>',
        'booked': '<span class="status-badge status-booked">Booked</span>',
        'maintenance': '<span class="status-badge status-maintenance">Maintenance</span>',
        'occupied': '<span class="status-badge status-occupied">Occupied</span>'
    };
    return badges[status] || '<span class="status-badge">Unknown</span>';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function showLoading() {
    document.getElementById('roomDetailLoading').style.display = 'flex';
    document.getElementById('roomDetailError').style.display = 'none';
    document.getElementById('roomDetailContent').style.display = 'none';
}

function hideLoading() {
    document.getElementById('roomDetailLoading').style.display = 'none';
}

function showError(message) {
    document.getElementById('roomDetailLoading').style.display = 'none';
    document.getElementById('roomDetailError').style.display = 'flex';
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('roomDetailContent').style.display = 'none';
}

function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

// Export functions for global access
window.changeMainImage = changeMainImage;
window.selectImage = selectImage;
