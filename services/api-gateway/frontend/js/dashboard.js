document.addEventListener("DOMContentLoaded", function() {
    fetchDashboardData();
});

async function fetchDashboardData() {
    try {
        const response = await fetch('http://localhost:8080/api/admin/dashboard');
        if (!response.ok) throw new Error("Failed to load dashboard data");

        const data = await response.json();
        updateUI(data);

    } catch (error) {
        console.error("Error:", error);
    }
}

// Biến toàn cục để lưu biểu đồ (giúp hủy biểu đồ cũ khi vẽ lại)
let roomChartInstance = null;
function updateUI(data) {
    // ... (Các phần cập nhật Summary Cards cũ giữ nguyên) ...
    setText('valAvailableRooms', `${data.availableRooms} / ${data.totalRooms}`);
    setText('valActiveBookings', data.activeBookings);
    setText('valTotalBookings', data.totalBookings);
    
    const revenue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalRevenue);
    setText('valTotalRevenue', revenue);

    // --- CẬP NHẬT ROOM STATUS (MỚI) ---
    // Điền số liệu vào 3 dòng
    setText('statEmpty', data.availableRooms);       // Empty
    setText('statRented', data.occupiedRooms);       // Rented
    setText('statMaintenance', data.maintenanceRooms || 0); // Maintenance

    // --- VẼ BIỂU ĐỒ (Cập nhật màu sắc cho khớp) ---
    renderRoomChart(data.availableRooms, data.occupiedRooms, data.maintenanceRooms || 0);

    // ... (Phần Recent Bookings giữ nguyên) ...
}

// Cập nhật hàm vẽ biểu đồ để có 3 màu
function renderRoomChart(empty, rented, maintenance) {
    const ctx = document.getElementById('roomStatusChart');
    if (!ctx) return;

    if (roomChartInstance) {
        roomChartInstance.destroy();
    }

    roomChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Empty', 'Rented', 'Maintenance'],
            datasets: [{
                data: [empty, rented, maintenance],
                backgroundColor: [
                    '#27ae60', // Xanh lá (Empty)
                    '#f1c40f', // Vàng cam (Rented)
                    '#95a5a6'  // Xám (Maintenance)
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Ẩn chú thích vì đã có list bên trên
            },
            cutout: '70%' // Làm vòng tròn mỏng hơn cho đẹp
        }
    });
}
function setText(id, value) {
    const el = document.getElementById(id);
    if(el) el.innerText = value;
}