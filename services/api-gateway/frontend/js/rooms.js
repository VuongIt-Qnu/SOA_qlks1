// Rooms management

let roomTypes = [];
let rooms = [];
let filteredRooms = [];

// Load room types
async function loadRoomTypes() {
    const tbody = document.getElementById('roomTypesTableBody');
    
    // Show loading in table
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Đang tải dữ liệu...</td></tr>';
    }
    
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('No token found, redirecting to login');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">Vui lòng đăng nhập...</td></tr>';
            }
            window.location.href = 'user.html#login';
            return;
        }
        
        console.log('[loadRoomTypes] Token found, calling API...');
        showLoading();
        roomTypes = await roomAPI.getRoomTypes();
        console.log('[loadRoomTypes] Room types loaded:', roomTypes.length);
        renderRoomTypesTable();
        console.log('[loadRoomTypes] Completed successfully');
    } catch (error) {
        console.error('[loadRoomTypes] Failed to load room types:', error);
        console.error('[loadRoomTypes] Error details:', {
            message: error.message,
            status: error.status,
            stack: error.stack
        });
        
        // Show error in table
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">Lỗi khi tải dữ liệu: ${error.message || 'Unknown error'}</td></tr>`;
        }
        
        // Check if it's an authentication error
        if (error.status === 401 || error.status === 403 || error.message?.includes('Unauthorized')) {
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            removeToken();
            setTimeout(() => {
                window.location.href = 'user.html#login';
            }, 2000);
        } else {
            showToast(error.message || 'Không thể tải danh sách loại phòng', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Load rooms
async function loadRooms() {
    console.log('[loadRooms] Starting...');
    // Support both IDs: roomTableBody (rooms.html) and roomsTableBody (admin.html)
    const tbody = document.getElementById('roomTableBody') || document.getElementById('roomsTableBody');
    const isAdminTable = document.getElementById('roomsTableBody') !== null;
    const colCount = isAdminTable ? 6 : 7;
    
    console.log('[loadRooms] tbody found:', !!tbody, 'isAdminTable:', isAdminTable);
    
    // Show loading in table
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center">Đang tải dữ liệu...</td></tr>`;
    }
    
    try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
            console.error('[loadRooms] No token found, redirecting to login');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center">Vui lòng đăng nhập...</td></tr>`;
            }
            window.location.href = 'user.html#login';
            return;
        }
        
        console.log('[loadRooms] Token found, calling API...');
        showLoading();
        
        // Load room types first to display room type names
        if (roomTypes.length === 0) {
            console.log('[loadRooms] Loading room types...');
            roomTypes = await roomAPI.getRoomTypes();
            console.log('[loadRooms] Room types loaded:', roomTypes.length);
        }
        
        console.log('[loadRooms] Loading rooms...');
        rooms = await roomAPI.getRooms();
        console.log('[loadRooms] Rooms loaded:', rooms.length);
        
        filteredRooms = [...rooms];
        renderRoomsTable();
        updateRoomStats();
        setupRoomSearch();
        console.log('[loadRooms] Completed successfully');
    } catch (error) {
        console.error('[loadRooms] Failed to load rooms:', error);
        console.error('[loadRooms] Error details:', {
            message: error.message,
            status: error.status,
            stack: error.stack
        });
        
        // Show error in table
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center">Lỗi khi tải dữ liệu: ${error.message || 'Unknown error'}</td></tr>`;
        }
        
        // Check if it's an authentication error
        if (error.status === 401 || error.status === 403 || error.message?.includes('Unauthorized')) {
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            removeToken();
            setTimeout(() => {
                window.location.href = 'user.html#login';
            }, 2000);
        } else {
            showToast(error.message || 'Không thể tải danh sách phòng', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Setup search and filter
function setupRoomSearch() {
    const searchInput = document.getElementById('filterKeyword');
    const statusFilter = document.getElementById('filterStatus');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            applyRoomFilters();
        }, 300));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            applyRoomFilters();
        });
    }
}

function applyRoomFilters() {
    const searchTerm = document.getElementById('filterKeyword')?.value.toLowerCase().trim() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    
    filteredRooms = rooms.filter(room => {
        // Search by ID or room_number (Name)
        const matchSearch = !searchTerm || 
            room.id.toString().includes(searchTerm) ||
            room.room_number.toLowerCase().includes(searchTerm);
        
        // Filter by status - convert status values to match database
        let matchStatus = true;
        if (statusFilter) {
            // Map HTML status values to database status values
            const statusMap = {
                'AVAILABLE': 'available',
                'BOOKED': 'booked',
                'IN_USE': 'occupied',
                'CLEANING': 'available', // Cleaning rooms are typically available
                'MAINTENANCE': 'maintenance'
            };
            const dbStatus = statusMap[statusFilter] || statusFilter.toLowerCase();
            matchStatus = room.status === dbStatus;
        }
        
        return matchSearch && matchStatus;
    });
    
    renderRoomsTable();
    updateRoomStats();
}

// Update room statistics
function updateRoomStats() {
    const emptyCount = rooms.filter(r => r.status === 'available').length;
    const rentedCount = rooms.filter(r => r.status === 'occupied' || r.status === 'booked').length;
    const maintenanceCount = rooms.filter(r => r.status === 'maintenance').length;
    
    const statEmpty = document.getElementById('statEmpty');
    const statRented = document.getElementById('statRented');
    const statMaintenance = document.getElementById('statMaintenance');
    
    if (statEmpty) statEmpty.textContent = emptyCount;
    if (statRented) statRented.textContent = rentedCount;
    if (statMaintenance) statMaintenance.textContent = maintenanceCount;
}

// Render room types table
function renderRoomTypesTable() {
    const tbody = document.getElementById('roomTypesTableBody');
    if (!tbody) {
        console.error('[renderRoomTypesTable] roomTypesTableBody not found');
        return;
    }
    
    if (roomTypes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có loại phòng nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = roomTypes.map(rt => `
        <tr>
            <td>${rt.id}</td>
            <td>${rt.name}</td>
            <td>${rt.description || '-'}</td>
            <td>${formatCurrency(rt.price_per_night)}</td>
            <td>${rt.max_occupancy}</td>
            <td>${rt.amenities || '-'}</td>
            <td>
                <button class="btn btn-secondary" onclick="editRoomType(${rt.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Render rooms table
function renderRoomsTable() {
    console.log('[renderRoomsTable] Starting...');
    // Support both IDs: roomTableBody (rooms.html) and roomsTableBody (admin.html)
    const tbody = document.getElementById('roomTableBody') || document.getElementById('roomsTableBody');
    
    if (!tbody) {
        console.error('[renderRoomsTable] roomTableBody or roomsTableBody not found!');
        console.error('[renderRoomsPage] Available elements:', {
            roomTableBody: !!document.getElementById('roomTableBody'),
            roomsTableBody: !!document.getElementById('roomsTableBody')
        });
        return;
    }
    
    console.log('[renderRoomsTable] Table body found, filtered rooms count:', filteredRooms.length);
    
    if (filteredRooms.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-bed"></i>
                        <h3>${rooms.length === 0 ? 'Chưa có phòng nào' : 'Không tìm thấy kết quả'}</h3>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredRooms.map(room => {
        const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
        return `
            <tr class="fade-in">
                <td>
                    <img src="/images/room-placeholder.jpg" alt="Room ${room.room_number}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect fill=%22%23ddd%22 width=%2260%22 height=%2260%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E${room.room_number}%3C/text%3E%3C/svg%3E'">
                </td>
                <td><strong>${room.room_number}</strong></td>
                <td>${roomType ? roomType.name : '-'}</td>
                <td>${roomType ? roomType.max_occupancy : '-'}</td>
                <td>${roomType ? formatCurrency(roomType.price_per_night) : '-'}</td>
                <td>${getStatusBadge(room.status)}</td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 5px;">
                        <button class="btn btn-secondary btn-sm" onclick="editRoom(${room.id})" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRoom(${room.id})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Giao diện Show room type modal
function showRoomTypeModal(roomTypeId = null) {
    const roomType = roomTypeId ? roomTypes.find(rt => rt.id === roomTypeId) : null;
    
    const content = `
        <h2>${roomType ? 'Sửa' : 'Thêm'} Loại Phòng</h2>
        <form id="roomTypeForm">
            <div class="form-group">
                <label>Tên Loại Phòng *</label>
                <input type="text" id="roomTypeName" class="form-control" 
                    value="${roomType ? roomType.name : ''}" required>
            </div>
            <div class="form-group">
                <label>Mô Tả</label>
                <textarea id="roomTypeDescription" class="form-control" rows="3">${roomType ? roomType.description || '' : ''}</textarea>
            </div>
            <div class="form-group">
                <label>Giá Mỗi Đêm (VND) *</label>
                <input type="number" id="roomTypePrice" class="form-control" 
                    value="${roomType ? roomType.price_per_night : ''}" required min="0">
            </div>
            <div class="form-group">
                <label>Số Người Tối Đa *</label>
                <input type="number" id="roomTypeMaxOccupancy" class="form-control" 
                    value="${roomType ? roomType.max_occupancy : ''}" required min="1">
            </div>
            <div class="form-group">
                <label>Tiện Ích</label>
                <input type="text" id="roomTypeAmenities" class="form-control" 
                    value="${roomType ? roomType.amenities || '' : ''}" 
                    placeholder="VD: WiFi, TV, Mini Bar">
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i> ${roomType ? 'Cập Nhật' : 'Thêm'}
                </button>
            </div>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('roomTypeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomTypeData = {
            name: document.getElementById('roomTypeName').value,
            description: document.getElementById('roomTypeDescription').value,
            price_per_night: parseFloat(document.getElementById('roomTypePrice').value),
            max_occupancy: parseInt(document.getElementById('roomTypeMaxOccupancy').value),
            amenities: document.getElementById('roomTypeAmenities').value
        };
        
        try {
            showLoading();
            await roomAPI.createRoomType(roomTypeData);
            showToast('Lưu loại phòng thành công', 'success');
            closeAllModals();
            loadRoomTypes();
        } catch (error) {
            showToast(error.message || 'Không thể lưu loại phòng', 'error');
        } finally {
            hideLoading();
        }
    });
}

// Show room modal
function showRoomModal(roomId = null) {
    const room = roomId ? rooms.find(r => r.id === roomId) : null;
    
    const content = `
        <h2>${room ? 'Sửa' : 'Thêm'} Phòng</h2>
        <form id="roomForm">
            <div class="form-group">
                <label>Số Phòng *</label>
                <input type="text" id="roomNumber" class="form-control" 
                    value="${room ? room.room_number : ''}" required>
            </div>
            <div class="form-group">
                <label>Loại Phòng *</label>
                <select id="roomTypeId" class="form-control" required>
                    <option value="">Chọn loại phòng</option>
                    ${roomTypes.map(rt => `
                        <option value="${rt.id}" ${room && room.room_type_id === rt.id ? 'selected' : ''}>
                            ${rt.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Trạng Thái *</label>
                <select id="roomStatus" class="form-control" required>
                    <option value="available" ${room && room.status === 'available' ? 'selected' : ''}>Có sẵn</option>
                    <option value="occupied" ${room && room.status === 'occupied' ? 'selected' : ''}>Đã thuê</option>
                    <option value="maintenance" ${room && room.status === 'maintenance' ? 'selected' : ''}>Bảo trì</option>
                </select>
            </div>
            <div class="form-group">
                <label>Tầng</label>
                <input type="number" id="roomFloor" class="form-control" 
                    value="${room ? room.floor || '' : ''}" min="1">
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i> ${room ? 'Cập Nhật' : 'Thêm'}
                </button>
            </div>
        </form>
    `;
    
    showModal(content);
    
    document.getElementById('roomForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomData = {
            room_number: document.getElementById('roomNumber').value,
            room_type_id: parseInt(document.getElementById('roomTypeId').value),
            status: document.getElementById('roomStatus').value,
            floor: document.getElementById('roomFloor').value ? parseInt(document.getElementById('roomFloor').value) : null
        };
        
        try {
            showLoading();
            if (room) {
                await roomAPI.updateRoom(room.id, roomData);
                showToast('Cập nhật phòng thành công', 'success');
            } else {
                await roomAPI.createRoom(roomData);
                showToast('Thêm phòng thành công', 'success');
            }
            closeAllModals();
            loadRooms();
        } catch (error) {
            showToast(error.message || 'Không thể lưu phòng', 'error');
        } finally {
            hideLoading();
        }
    });
}

// Edit functions
function editRoomType(id) {
    openRoomTypeModal(id);
}

function editRoom(id) {
    openModal(id);
}

// Tab functions
function showRoomTypes() {
    console.log('[showRoomTypes] Called');
    const roomTypesSection = document.getElementById('roomTypesSection');
    const roomsSection = document.getElementById('roomsSection');
    
    if (roomTypesSection) {
        roomTypesSection.classList.add('active');
    }
    if (roomsSection) {
        roomsSection.classList.remove('active');
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load room types if not already loaded
    if (roomTypes.length === 0) {
        console.log('[showRoomTypes] Loading room types...');
        if (typeof loadRoomTypes === 'function') {
            loadRoomTypes();
        } else {
            console.error('[showRoomTypes] loadRoomTypes function not found!');
        }
    } else {
        renderRoomTypesTable();
    }
}

function showRooms() {
    console.log('[showRooms] Called');
    const roomsSection = document.getElementById('roomsSection');
    const roomTypesSection = document.getElementById('roomTypesSection');
    
    if (roomsSection) {
        roomsSection.classList.add('active');
        console.log('[showRooms] roomsSection activated');
    }
    if (roomTypesSection) {
        roomTypesSection.classList.remove('active');
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Always load rooms when switching to rooms tab to ensure fresh data
    console.log('[showRooms] Calling loadRooms...');
    if (typeof loadRooms === 'function') {
        loadRooms();
    } else {
        console.error('[showRooms] loadRooms function not found!');
    }
}

// Open modal for adding new room or editing existing room
async function openModal(roomId = null) {
    console.log('[openModal] Called with roomId:', roomId);
    const modal = document.getElementById('roomModal');
    if (!modal) {
        console.error('[openModal] roomModal not found in DOM');
        return;
    }
    console.log('[openModal] Modal element found:', modal);
    
    // Load room types if not already loaded
    if (roomTypes.length === 0) {
        try {
            console.log('[openModal] Loading room types...');
            showLoading();
            roomTypes = await roomAPI.getRoomTypes();
            console.log('[openModal] Room types loaded:', roomTypes.length);
        } catch (error) {
            console.error('[openModal] Failed to load room types:', error);
            showToast('Không thể tải danh sách loại phòng', 'error');
            return;
        } finally {
            hideLoading();
        }
    }
    
    // Reset form
    const form = document.getElementById('roomForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (form) {
        form.reset();
        const roomIdInput = document.getElementById('roomId');
        if (roomIdInput) roomIdInput.value = roomId || '';
        
        if (roomId) {
            // Edit mode - load room data
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                const nameInput = document.getElementById('roomName');
                const typeSelect = document.getElementById('roomType');
                const statusSelect = document.getElementById('roomStatus');
                
                if (nameInput) nameInput.value = room.room_number || '';
                if (typeSelect) typeSelect.value = room.room_type_id || '';
                
                // Map database status to HTML status
                const statusMap = {
                    'available': 'AVAILABLE',
                    'booked': 'BOOKED',
                    'occupied': 'IN_USE',
                    'maintenance': 'MAINTENANCE'
                };
                if (statusSelect) statusSelect.value = statusMap[room.status] || 'AVAILABLE';
                
                // Note: Capacity and Area are not stored in room, they come from room type
                const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
                if (roomType) {
                    const capacityInput = document.getElementById('roomCapacity');
                    if (capacityInput) capacityInput.value = roomType.max_occupancy || 2;
                }
                if (modalTitle) modalTitle.textContent = 'Edit Room';
            }
        } else {
            // Add mode
            if (modalTitle) modalTitle.textContent = 'Add New Room';
        }
    }
    
    // Populate room type select with data from API
    const roomTypeSelect = document.getElementById('roomType');
    if (roomTypeSelect && roomTypes.length > 0) {
        roomTypeSelect.innerHTML = '<option value="">Chọn loại phòng</option>' +
            roomTypes.map(rt => `<option value="${rt.id}">${rt.name}</option>`).join('');
        // Set selected value if editing
        if (roomId) {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                roomTypeSelect.value = room.room_type_id;
            }
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
        form.addEventListener('submit', handleRoomFormSubmit);
        form.dataset.handlerAttached = 'true';
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('roomModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Open modal for adding new room type
async function openRoomTypeModal(roomTypeId = null) {
    const modal = document.getElementById('roomTypeModal');
    if (!modal) {
        console.error('roomTypeModal not found');
        return;
    }
    
    // Reset form
    const form = document.getElementById('roomTypeForm');
    const modalTitle = document.getElementById('roomTypeModalTitle');
    
    if (form) {
        form.reset();
        document.getElementById('roomTypeId').value = roomTypeId || '';
        
        if (roomTypeId) {
            // Edit mode - load room type data
            const roomType = roomTypes.find(rt => rt.id === roomTypeId);
            if (roomType) {
                document.getElementById('roomTypeName').value = roomType.name || '';
                document.getElementById('roomTypeDescription').value = roomType.description || '';
                document.getElementById('roomTypePrice').value = roomType.price_per_night || '';
                document.getElementById('roomTypeMaxOccupancy').value = roomType.max_occupancy || '';
                document.getElementById('roomTypeAmenities').value = roomType.amenities || '';
                if (modalTitle) modalTitle.textContent = 'Edit Room Type';
            }
        } else {
            // Add mode
            if (modalTitle) modalTitle.textContent = 'Add New Room Type';
        }
    }
    
    // Show modal
    modal.classList.add('show');
    
    // Setup form submit handler (only once)
    if (form && !form.dataset.handlerAttached) {
        form.addEventListener('submit', handleRoomTypeFormSubmit);
        form.dataset.handlerAttached = 'true';
    }
}

// Close room type modal
function closeRoomTypeModal() {
    const modal = document.getElementById('roomTypeModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Handle room type form submit
async function handleRoomTypeFormSubmit(e) {
    e.preventDefault();
    
    const roomTypeId = document.getElementById('roomTypeId').value;
    const name = document.getElementById('roomTypeName').value.trim();
    const description = document.getElementById('roomTypeDescription').value.trim();
    const pricePerNight = document.getElementById('roomTypePrice').value;
    const maxOccupancy = document.getElementById('roomTypeMaxOccupancy').value;
    const amenities = document.getElementById('roomTypeAmenities').value.trim();
    
    // Validation
    if (!name) {
        showToast('Vui lòng nhập tên loại phòng', 'error');
        return;
    }
    
    if (!pricePerNight || parseFloat(pricePerNight) <= 0) {
        showToast('Vui lòng nhập giá hợp lệ', 'error');
        return;
    }
    
    if (!maxOccupancy || parseInt(maxOccupancy) < 1) {
        showToast('Vui lòng nhập số người tối đa hợp lệ', 'error');
        return;
    }
    
    // Prepare room type data
    const roomTypeData = {
        name: name,
        description: description || null,
        price_per_night: parseFloat(pricePerNight),
        max_occupancy: parseInt(maxOccupancy),
        amenities: amenities || null
    };
    
    try {
        showLoading();
        
        if (roomTypeId) {
            // Update existing room type
            await roomAPI.updateRoomType(parseInt(roomTypeId), roomTypeData);
            showToast('Cập nhật loại phòng thành công', 'success');
        } else {
            // Create new room type
            await roomAPI.createRoomType(roomTypeData);
            showToast('Thêm loại phòng thành công', 'success');
        }
        
        closeRoomTypeModal();
        // Reload room types and rooms to refresh data
        await loadRoomTypes();
        await loadRooms();
    } catch (error) {
        console.error('Failed to save room type:', error);
        showToast(error.message || 'Không thể lưu loại phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Handle room form submit
async function handleRoomFormSubmit(e) {
    e.preventDefault();
    
    const roomId = document.getElementById('roomId').value;
    const roomName = document.getElementById('roomName').value.trim();
    const roomTypeId = document.getElementById('roomType').value;
    const roomStatus = document.getElementById('roomStatus').value;
    
    // Validation
    if (!roomName) {
        showToast('Vui lòng nhập tên phòng', 'error');
        return;
    }
    
    if (!roomTypeId) {
        showToast('Vui lòng chọn loại phòng', 'error');
        return;
    }
    
    // Map status from HTML to database format
    const statusMap = {
        'AVAILABLE': 'available',
        'BOOKED': 'booked',
        'IN_USE': 'occupied',
        'CLEANING': 'available',
        'MAINTENANCE': 'maintenance'
    };
    const dbStatus = statusMap[roomStatus] || roomStatus.toLowerCase();
    
    // Prepare room data (floor is optional, can be null)
    const roomData = {
        room_number: roomName,
        room_type_id: parseInt(roomTypeId),
        status: dbStatus,
        floor: null  // Floor field removed from form, set to null
    };
    
    try {
        showLoading();
        
        if (roomId) {
            // Update existing room
            await roomAPI.updateRoom(parseInt(roomId), roomData);
            showToast('Cập nhật phòng thành công', 'success');
        } else {
            // Create new room
            await roomAPI.createRoom(roomData);
            showToast('Thêm phòng thành công', 'success');
        }
        
        closeModal();
        loadRooms();
    } catch (error) {
        console.error('Failed to save room:', error);
        showToast(error.message || 'Không thể lưu phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Delete room function
async function deleteRoom(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        showToast('Không tìm thấy phòng', 'error');
        return;
    }
    
    // Confirm deletion
    const confirmed = await confirmAction(
        `Bạn có chắc chắn muốn xóa phòng "${room.room_number}"? Hành động này không thể hoàn tác.`,
        'Xác nhận xóa phòng'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        showLoading();
        await roomAPI.deleteRoom(roomId);
        showToast('Xóa phòng thành công', 'success');
        loadRooms();
    } catch (error) {
        console.error('Failed to delete room:', error);
        showToast(error.message || 'Không thể xóa phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRoomsPage);
} else {
    initRoomsPage();
}

function initRoomsPage() {
    console.log('[initRoomsPage] Starting initialization...');
    // Check if we're on the rooms management page
    // Support both IDs: roomTableBody (rooms.html) and roomsTableBody (admin.html)
    const tbody = document.getElementById('roomTableBody') || document.getElementById('roomsTableBody');
    const roomTypesTableBody = document.getElementById('roomTypesTableBody');
    
    console.log('[initRoomsPage] tbody found:', !!tbody);
    console.log('[initRoomsPage] roomTypesTableBody found:', !!roomTypesTableBody);
    
    // Always load room types if roomTypesTableBody exists (for admin.html)
    if (roomTypesTableBody) {
        console.log('[initRoomsPage] Loading room types...');
        if (typeof loadRoomTypes === 'function') {
            loadRoomTypes();
        } else {
            console.error('[initRoomsPage] loadRoomTypes function not found!');
        }
    }
    
    // Only load rooms if we're on the rooms page (not just room types)
    // Check if roomsSection exists (admin.html) or if we're on standalone rooms.html
    const roomsSection = document.getElementById('roomsSection');
    const isStandaloneRoomsPage = document.getElementById('roomTableBody') !== null;
    
    console.log('[initRoomsPage] roomsSection found:', !!roomsSection);
    console.log('[initRoomsPage] isStandaloneRoomsPage:', isStandaloneRoomsPage);
    console.log('[initRoomsPage] roomsSection active:', roomsSection ? roomsSection.classList.contains('active') : false);
    
    // Load rooms if we're on standalone page or if rooms section is active
    if (isStandaloneRoomsPage || (roomsSection && roomsSection.classList.contains('active'))) {
        console.log('[initRoomsPage] Loading rooms...');
        if (typeof loadRooms === 'function') {
            loadRooms();
        } else {
            console.error('[initRoomsPage] loadRooms function not found!');
        }
    } else if (tbody) {
        // If table body exists but section is not active, show loading message
        console.log('[initRoomsPage] Table body exists but section not active, showing loading...');
        const isAdminTable = document.getElementById('roomsTableBody') !== null;
        const colCount = isAdminTable ? 6 : 7;
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center">Click "Room List" tab to load data</td></tr>`;
    }
    
    // Close modal when clicking outside
    const roomModal = document.getElementById('roomModal');
    const roomTypeModal = document.getElementById('roomTypeModal');
    
    if (roomModal) {
        window.onclick = function(event) {
            if (event.target === roomModal) {
                closeModal();
            }
            if (event.target === roomTypeModal) {
                closeRoomTypeModal();
            }
        };
    }
    
    console.log('[initRoomsPage] Initialization completed');
}

// Export
window.loadRoomTypes = loadRoomTypes;
window.loadRooms = loadRooms;
window.showRoomTypeModal = showRoomTypeModal;
window.showRoomModal = showRoomModal;
window.editRoomType = editRoomType;
window.editRoom = editRoom;
window.showRoomTypes = showRoomTypes;
window.showRooms = showRooms;
window.applyRoomFilters = applyRoomFilters;
window.updateRoomStats = updateRoomStats;
window.openModal = openModal;
window.closeModal = closeModal;
window.openRoomTypeModal = openRoomTypeModal;
window.closeRoomTypeModal = closeRoomTypeModal;
window.deleteRoom = deleteRoom;

