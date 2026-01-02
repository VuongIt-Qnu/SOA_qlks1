// Dashboard functionality

let revenueChart = null;
let bookingStatusChart = null;

// Load dashboard data
async function loadDashboard() {
    try {
        showLoading();
        // Load stats
        const [rooms, bookings, payments, customers, dashboardData] = await Promise.all([
            roomAPI.getRooms().catch(() => []),
            bookingAPI.getAll().catch(() => []),
            paymentAPI.getAll({ payment_status: 'completed' }).catch(() => []),
            customerAPI.getAll().catch(() => []),
            reportAPI.getDashboard().catch(() => null)
        ]);
        
        // Update stats
        document.getElementById('totalRooms').textContent = rooms.length;
        document.getElementById('totalBookings').textContent = bookings.length;
        document.getElementById('totalCustomers').textContent = customers.length;
        
        // Calculate total revenue
        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        
        // Load charts
        loadCharts(bookings, payments);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showToast('Không thể tải dữ liệu dashboard', 'error');
    } finally {
        hideLoading();
    }
}

// Load charts
function loadCharts(bookings, payments) {
    // Revenue chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        if (revenueChart) {
            revenueChart.destroy();
        }
        
        // Group payments by date
        const revenueByDate = {};
        payments.forEach(payment => {
            const date = new Date(payment.created_at).toLocaleDateString('vi-VN');
            revenueByDate[date] = (revenueByDate[date] || 0) + payment.amount;
        });
        
        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: Object.keys(revenueByDate),
                datasets: [{
                    label: 'Doanh Thu (VND)',
                    data: Object.values(revenueByDate),
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Booking status chart
    const bookingStatusCtx = document.getElementById('bookingStatusChart');
    if (bookingStatusCtx) {
        if (bookingStatusChart) {
            bookingStatusChart.destroy();
        }
        
        const statusCounts = {
            'pending': 0,
            'confirmed': 0,
            'cancelled': 0,
            'completed': 0
        };
        
        bookings.forEach(booking => {
            statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
        });
        
        bookingStatusChart = new Chart(bookingStatusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Chờ Xử Lý', 'Đã Xác Nhận', 'Đã Hủy', 'Hoàn Thành'],
                datasets: [{
                    data: [
                        statusCounts.pending,
                        statusCounts.confirmed,
                        statusCounts.cancelled,
                        statusCounts.completed
                    ],
                    backgroundColor: [
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(37, 99, 235, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Export
window.loadDashboard = loadDashboard;

