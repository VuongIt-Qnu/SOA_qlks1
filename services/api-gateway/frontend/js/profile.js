const apiBase = "http://localhost:8080/api";

let userData = null;
let bookingStats = null;

document.addEventListener("DOMContentLoaded", function() {
    loadUserProfile();
    setupEventListeners();
});

// Load user profile
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            window.location.href = "/auth/login.html";
            return;
        }

        // Gọi API lấy thông tin user
        const response = await fetch(`${apiBase}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            window.location.href = "/auth/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load profile");
        }

        userData = await response.json();
        displayUserProfile();
        loadBookingStats();

    } catch (error) {
        console.error("Error loading profile:", error);
        alert("Error loading profile: " + error.message);
    }
}

// Display profile data
function displayUserProfile() {
    if (!userData) return;

    // Sidebar
    document.getElementById('sidebarName').textContent = userData.fullName || 'User';
    document.getElementById('sidebarEmail').textContent = userData.email || '';

    // Form fields
    document.getElementById('fullName').value = userData.fullName || '';
    document.getElementById('email').value = userData.email || '';
    const phoneEl = document.getElementById('phone');
    const passportEl = document.getElementById('passport');
    const nationalityEl = document.getElementById('nationality');

    if (phoneEl) phoneEl.value = userData.phoneNumber || '';
    if (passportEl) passportEl.value = userData.passport || '';
    if (nationalityEl) nationalityEl.value = userData.nationality || '';
    // nationality already set above if element exists

    // Member since
    if (userData.createdAt) {
        const date = new Date(userData.createdAt);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        document.getElementById('statMemberSince').textContent = monthYear;
    }
}

// Load booking stats
async function loadBookingStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiBase}/bookings/my-bookings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const bookings = await response.json();
            document.getElementById('statTotalBookings').textContent = bookings.length;
            
            // Count active reservations (CONFIRMED)
            const active = bookings.filter(b => b.status === 'CONFIRMED').length;
            document.getElementById('statActiveReservations').textContent = active;
        }
    } catch (error) {
        console.error("Error loading booking stats:", error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Section navigation
    document.querySelectorAll('.profile-menu-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active button
            document.querySelectorAll('.profile-menu-item').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Edit personal info
    document.getElementById('btnEditPersonal').addEventListener('click', function() {
        const inputs = document.querySelectorAll('#personalForm input');
        const isDisabled = inputs[0].disabled;
        
        inputs.forEach(input => input.disabled = !isDisabled);
        document.getElementById('btnSavePersonal').style.display = isDisabled ? 'block' : 'none';
    });

    // Save personal info
    document.getElementById('btnSavePersonal').addEventListener('click', async function(e) {
        e.preventDefault();
        await savePersonalInfo();
    });

    // Change password
    document.getElementById('passwordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await changePassword();
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            window.location.href = '/auth/login.html';
        }
    });
}

// Show specific section
function showSection(section) {
    document.querySelectorAll('[id$="Section"]').forEach(el => {
        el.style.display = 'none';
    });
    document.getElementById(section + 'Section').style.display = 'block';
}

// Save personal info
async function savePersonalInfo() {
    try {
        const token = localStorage.getItem('token');
        
        const data = {
            fullName: document.getElementById('fullName').value,
            phoneNumber: (document.getElementById('phone') && document.getElementById('phone').value) || null,
            passport: (document.getElementById('passport') && document.getElementById('passport').value) || null,
            nationality: (document.getElementById('nationality') && document.getElementById('nationality').value) || null
        };

        const response = await fetch(`${apiBase}/users/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        // Update local data
        userData = { ...userData, ...data };
        displayUserProfile();

        // Show success message
        const successMsg = document.getElementById('personalSuccess');
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);

        // Disable edit mode
        const inputs = document.querySelectorAll('#personalForm input');
        inputs.forEach(input => input.disabled = true);
        document.getElementById('btnSavePersonal').style.display = 'none';

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Change password
async function changePassword() {
    try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters');
            return;
        }

        const token = localStorage.getItem('token');
        
        const response = await fetch(`${apiBase}/users/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        if (response.status === 401) {
            alert('Current password is incorrect');
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to change password');
        }

        // Show success message
        const successMsg = document.getElementById('passwordSuccess');
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);

        // Clear form
        document.getElementById('passwordForm').reset();

    } catch (error) {
        alert('Error: ' + error.message);
    }
}
