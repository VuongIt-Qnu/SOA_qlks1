const apiBase = "http://localhost:8080/api";

let allBookings = [];
let filteredBookings = [];
let currentFilter = 'all';

document.addEventListener("DOMContentLoaded", function() {
    loadUserBookings();
    setupTabFilters();
});

// Load bookings từ API
async function loadUserBookings() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            // Save where to return after login
            localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            window.location.href = "/auth/login.html";
            return;
        }

        // Gọi API lấy bookings của user hiện tại
        const response = await fetch(`${apiBase}/bookings/my-bookings`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            alert("Session expired. Please login again!");
            localStorage.removeItem('token');
            window.location.href = "/auth/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load bookings");
        }

        allBookings = await response.json();
        filteredBookings = allBookings;

        updateStats();
        renderBookings(filteredBookings);
        updateTabCounts();

    } catch (error) {
        console.error("Error loading bookings:", error);
        document.getElementById('bookingsTableBody').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #e74c3c;">
                    <i class="fa-solid fa-exclamation-circle"></i> Error loading bookings. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Update stats
function updateStats() {
    const total = allBookings.length;
    const confirmed = allBookings.filter(b => b.status === 'CONFIRMED').length;
    const pending = allBookings.filter(b => b.status === 'PENDING').length;
    const cancelled = allBookings.filter(b => b.status === 'CANCELLED').length;

    document.getElementById('totalBookings').textContent = total;
    document.getElementById('confirmedCount').textContent = confirmed;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('cancelledCount').textContent = cancelled;
}

// Update tab counts
function updateTabCounts() {
    const tabs = {
        'all': allBookings.length,
        'confirmed': allBookings.filter(b => b.status === 'CONFIRMED').length,
        'pending': allBookings.filter(b => b.status === 'PENDING').length,
        'cancelled': allBookings.filter(b => b.status === 'CANCELLED').length
    };

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const status = btn.getAttribute('data-status');
        btn.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)}(${tabs[status]})`;
    });
}

// Setup tab filters
function setupTabFilters() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            currentFilter = status;

            // Update active tab
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Filter and render
            if (status === 'all') {
                filteredBookings = allBookings;
            } else {
                filteredBookings = allBookings.filter(b => b.status.toLowerCase() === status);
            }

            renderBookings(filteredBookings);
        });
    });
}

// Render bookings table
function renderBookings(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    const noBookings = document.getElementById('noBookings');

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '';
        noBookings.style.display = 'block';
        return;
    }

    noBookings.style.display = 'none';
    tbody.innerHTML = '';

    bookings.forEach(booking => {
        const priceValue = Math.round(booking.totalPrice);
        const price = '$' + priceValue.toLocaleString('en-US');
        const statusClass = booking.status.toLowerCase();

        // Format dates
        const checkIn = new Date(booking.checkIn).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const checkOut = new Date(booking.checkOut).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Action buttons based on status
        let actions = '';
        if (booking.status === 'PENDING') {
            actions = `
                <div class="booking-actions">
                    <button class="btn-small btn-view" onclick="viewBookingDetail(${booking.id})">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </div>
            `;
        } else if (booking.status === 'CONFIRMED') {
            actions = `
                <div class="booking-actions">
                    <button class="btn-small btn-view" onclick="viewBookingDetail(${booking.id})">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </div>
            `;
        } else {
            actions = `
                <div class="booking-actions">
                    <button class="btn-small btn-view" onclick="viewBookingDetail(${booking.id})">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </div>
            `;
        }

        const row = `
            <tr>
                <td>#${booking.id}</td>
                <td>${booking.roomName}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td>${booking.guests}</td>
                <td style="font-weight: bold;">${price}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${booking.status}
                    </span>
                </td>
                <td>
                    ${actions}
                </td>
            </tr>
        `;

        tbody.innerHTML += row;
    });
}

// View booking detail
function viewBookingDetail(bookingId) {
    // Navigate to detail page or show modal
    const booking = allBookings.find(b => b.id === bookingId);
    if (booking) {
        alert(`Booking #${booking.id}\n\nRoom: ${booking.roomName}\nCheck-in: ${booking.checkIn}\nCheck-out: ${booking.checkOut}\nStatus: ${booking.status}\nTotal: $${Math.round(booking.totalPrice)}`);
    }
}

// Cancel booking
function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    const token = localStorage.getItem('token');
    fetch(`${apiBase}/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) return res.text().then(text => Promise.reject(new Error(text)));
        return res.text();
    })
    .then(data => {
        alert('Booking cancelled successfully');
        loadUserBookings(); // Reload
    })
    .catch(err => alert('Error: ' + err.message));
}
