// Rooms management

let roomTypes = [];
let rooms = [];
let filteredRooms = [];

// Load room types
async function loadRoomTypes() {
    try {
        showLoading();
        roomTypes = await roomAPI.getRoomTypes();
        renderRoomTypesTable();
    } catch (error) {
        console.error('Failed to load room types:', error);
        showToast('Không thể tải danh sách loại phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Load rooms
async function loadRooms() {
    try {
        showLoading();
        rooms = await roomAPI.getRooms();
        filteredRooms = [...rooms];
        renderRoomsTable();
        setupRoomSearch();
    } catch (error) {
        console.error('Failed to load rooms:', error);
        showToast('Không thể tải danh sách phòng', 'error');
    } finally {
        hideLoading();
    }
}

// Setup search and filter
function setupRoomSearch() {
    const searchInput = document.getElementById('roomSearch');
    const statusFilter = document.getElementById('roomStatusFilter');
    
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
    const searchTerm = document.getElementById('roomSearch')?.value.toLowerCase().trim() || '';
    const statusFilter = document.getElementById('roomStatusFilter')?.value || '';
    
    filteredRooms = rooms.filter(room => {
        const matchSearch = !searchTerm || 
            room.room_number.toLowerCase().includes(searchTerm) ||
            (room.floor && room.floor.toString().includes(searchTerm));
        const matchStatus = !statusFilter || room.status === statusFilter;
        return matchSearch && matchStatus;
    });
    
    renderRoomsTable();
}

// Render room types table
function renderRoomTypesTable() {
    const tbody = document.getElementById('roomTypesTableBody');
    
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
                    <i class="fas fa-edit"></i> Sửa
                </button>
            </td>
        </tr>
    `).join('');
}

// Render rooms table
function renderRoomsTable() {
    const tbody = document.getElementById('roomsTableBody');
    
    if (filteredRooms.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
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
                <td>${room.id}</td>
                <td><strong>${room.room_number}</strong></td>
                <td>${roomType ? roomType.name : '-'}</td>
                <td>${getStatusBadge(room.status)}</td>
                <td>${room.floor ? `Tầng ${room.floor}` : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="editRoom(${room.id})" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Show room type modal
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
    showRoomTypeModal(id);
}

function editRoom(id) {
    showRoomModal(id);
}

// Tab functions
function showRoomTypes() {
    document.getElementById('roomTypesSection').classList.add('active');
    document.getElementById('roomsSection').classList.remove('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function showRooms() {
    document.getElementById('roomsSection').classList.add('active');
    document.getElementById('roomTypesSection').classList.remove('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
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

