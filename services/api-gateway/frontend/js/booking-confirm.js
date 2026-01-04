const apiBase = "http://localhost:8080/api";

let bookingData = {
  roomId: null,
  checkIn: null,
  checkOut: null,
  guests: null,
  roomPrice: 0,
  nights: 0,
  totalPrice: 0
};

document.addEventListener("DOMContentLoaded", function () {
  // 1. Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  bookingData.roomId = params.get('roomId');
  bookingData.checkIn = params.get('checkIn');
  bookingData.checkOut = params.get('checkOut');
  bookingData.guests = params.get('guests') || '2';

  if (!bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) {
    showError("Missing booking information. Please start again.");
    return;
  }

  // 2. Calculate nights and fetch room details
  calculateNights();
  loadRoomDetails();

  // 3. Populate form with user data if logged in
  populateUserData();

  // 4. Setup confirm button
  document.getElementById('confirmBookingBtn').addEventListener('click', submitBooking);
});

function calculateNights() {
  const checkIn = new Date(bookingData.checkIn);
  const checkOut = new Date(bookingData.checkOut);
  bookingData.nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  
  if (bookingData.nights <= 0) {
    showError("Invalid dates. Check-out must be after check-in.");
  }
}

async function loadRoomDetails() {
  try {
    const response = await fetch(`${apiBase}/rooms/${bookingData.roomId}`);
    if (!response.ok) throw new Error("Room not found");
    
    const room = await response.json();
    bookingData.roomPrice = room.pricePerNight;
    bookingData.totalPrice = bookingData.roomPrice * bookingData.nights;

    updateSummary(room);
  } catch (error) {
    console.error("Error loading room:", error);
    showError("Failed to load room details. Please try again.");
  }
}

function updateSummary(room) {
  // Room info
  document.getElementById('summaryRoomName').textContent = room.name;
  document.getElementById('summaryCheckIn').textContent = formatDate(bookingData.checkIn);
  document.getElementById('summaryCheckOut').textContent = formatDate(bookingData.checkOut);
  document.getElementById('summaryGuests').textContent = bookingData.guests + ' guest(s)';

  // Pricing
  const roomRate = '$' + Math.round(bookingData.roomPrice).toLocaleString('en-US');
  document.getElementById('summaryRoomRate').textContent = roomRate;
  document.getElementById('summaryNights').textContent = bookingData.nights + ' night(s)';
  
  const subtotal = '$' + Math.round(bookingData.totalPrice).toLocaleString('en-US');
  document.getElementById('summarySubtotal').textContent = subtotal;
  document.getElementById('summaryTotalPrice').textContent = subtotal;
}

function populateUserData() {
  const token = localStorage.getItem('token');
  if (!token) return; // Not logged in, leave form empty

  // Try to fetch and populate user profile if logged in
  fetch(`${apiBase}/users/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.ok ? res.json() : null)
  .then(user => {
    if (user) {
      document.getElementById('fullName').value = user.fullName || '';
      document.getElementById('email').value = user.email || '';
      document.getElementById('phone').value = user.phoneNumber || '';
      document.getElementById('address').value = user.address || '';
    }
  })
  .catch(err => console.log("Could not load user profile"));
}

async function submitBooking() {
  // Validation
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const agreeTerms = document.getElementById('agreeTerms').checked;

  if (!fullName || !email || !phone) {
    showError("Please fill in all required fields (Full Name, Email, Phone).");
    return;
  }

  if (!agreeTerms) {
    showError("Please agree to the terms and conditions.");
    return;
  }

  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    // Not logged in, redirect to login and save booking info
    localStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = "/auth/login.html";
    return;
  }

  const btn = document.getElementById('confirmBookingBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const bookingPayload = {
      roomId: parseInt(bookingData.roomId),
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      guests: parseInt(bookingData.guests),
      totalPrice: bookingData.totalPrice,
      specialRequests: document.getElementById('specialRequests').value || null
    };

    const response = await fetch(`${apiBase}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingPayload)
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = "/auth/login.html";
      return;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const result = await response.json();
    showSuccess(`Booking successful! Your confirmation ID: ${result.id}`);
    
    setTimeout(() => {
      window.location.href = '/user/bookings.html';
    }, 2000);

  } catch (error) {
    console.error("Booking error:", error);
    showError(`Booking failed: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSuccess(message) {
  const successEl = document.getElementById('successMessage');
  successEl.textContent = message;
  successEl.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
