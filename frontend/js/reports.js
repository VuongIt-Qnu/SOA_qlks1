// Reports management

// Load reports
async function loadReports() {
    await Promise.all([
        loadBookingReport(),
        loadRoomReport()
    ]);
}

// Load revenue report
async function loadRevenueReport() {
    const startDate = document.getElementById('revenueStartDate').value;
    const endDate = document.getElementById('revenueEndDate').value;
    
    if (!startDate || !endDate) {
        alert('Vui lòng chọn cả ngày bắt đầu và ngày kết thúc');
        return;
    }
    
    try {
        const report = await reportAPI.getRevenue(startDate, endDate);
        const content = document.getElementById('revenueReportContent');
        
        content.innerHTML = `
            <div class="report-summary">
                <div class="stat-item">
                    <strong>Tổng Doanh Thu:</strong>
                    <span class="stat-value">${formatCurrency(report.total_revenue)}</span>
                </div>
                <div class="stat-item">
                    <strong>Số Lượng Thanh Toán:</strong>
                    <span class="stat-value">${report.payment_count}</span>
                </div>
                <div class="stat-item">
                    <strong>Trung Bình Mỗi Thanh Toán:</strong>
                    <span class="stat-value">${formatCurrency(report.average_payment)}</span>
                </div>
                <div class="stat-item">
                    <strong>Thời Gian:</strong>
                    <span class="stat-value">${formatDate(report.start_date)} - ${formatDate(report.end_date)}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load revenue report:', error);
        document.getElementById('revenueReportContent').innerHTML = 
            '<p class="text-center">Lỗi khi tải báo cáo doanh thu</p>';
    }
}

// Load booking report
async function loadBookingReport() {
    try {
        const report = await reportAPI.getBookings();
        const content = document.getElementById('bookingReportContent');
        
        content.innerHTML = `
            <div class="report-summary">
                <div class="stat-item">
                    <strong>Tổng Đặt Phòng:</strong>
                    <span class="stat-value">${report.total_bookings}</span>
                </div>
                <div class="stat-item">
                    <strong>Đã Xác Nhận:</strong>
                    <span class="stat-value badge-success">${report.confirmed}</span>
                </div>
                <div class="stat-item">
                    <strong>Đã Hủy:</strong>
                    <span class="stat-value badge-danger">${report.cancelled}</span>
                </div>
                <div class="stat-item">
                    <strong>Chờ Xử Lý:</strong>
                    <span class="stat-value badge-warning">${report.pending}</span>
                </div>
                <div class="stat-item">
                    <strong>Tỷ Lệ Xác Nhận:</strong>
                    <span class="stat-value">${report.confirmation_rate.toFixed(2)}%</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load booking report:', error);
        document.getElementById('bookingReportContent').innerHTML = 
            '<p class="text-center">Lỗi khi tải báo cáo đặt phòng</p>';
    }
}

// Load room report
async function loadRoomReport() {
    try {
        const report = await reportAPI.getRooms();
        const content = document.getElementById('roomReportContent');
        
        content.innerHTML = `
            <div class="report-summary">
                <div class="stat-item">
                    <strong>Tổng Số Phòng:</strong>
                    <span class="stat-value">${report.total_rooms}</span>
                </div>
                <div class="stat-item">
                    <strong>Có Sẵn:</strong>
                    <span class="stat-value badge-success">${report.available}</span>
                </div>
                <div class="stat-item">
                    <strong>Đã Thuê:</strong>
                    <span class="stat-value badge-danger">${report.occupied}</span>
                </div>
                <div class="stat-item">
                    <strong>Bảo Trì:</strong>
                    <span class="stat-value badge-warning">${report.maintenance}</span>
                </div>
                <div class="stat-item">
                    <strong>Tỷ Lệ Lấp Đầy:</strong>
                    <span class="stat-value">${report.occupancy_rate.toFixed(2)}%</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load room report:', error);
        document.getElementById('roomReportContent').innerHTML = 
            '<p class="text-center">Lỗi khi tải báo cáo phòng</p>';
    }
}

// Export
window.loadReports = loadReports;
window.loadRevenueReport = loadRevenueReport;

