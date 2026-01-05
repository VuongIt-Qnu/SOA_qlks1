// static/user/rooms.js

let allRooms = [];
let currentPage = 1;
const pageSize = 12;

// Helper
function $(id) {
  return document.getElementById(id);
}

// ----- DOM READY -----
document.addEventListener("DOMContentLoaded", function () {
    // 1. Lấy ID từ URL (Ví dụ: room-detail.html?id=5 -> lấy được số 5)
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');

    if (roomId) {
        loadRoomDetail(roomId);
    } else {
        alert("Không tìm thấy ID phòng!");
        window.location.href = "/user/home.html"; // Quay về trang chủ nếu không có ID
    }

    // Xử lý nút "Book This Room"
    const bookBtn = document.getElementById("bookThisRoomBtn");
    if (bookBtn) {
        bookBtn.addEventListener("click", function() {
            // Get check-in/check-out from localStorage (saved from hero-search)
            const checkIn = localStorage.getItem('bookingCheckIn') || new Date().toISOString().split('T')[0];
            const checkOut = localStorage.getItem('bookingCheckOut') || new Date(Date.now() + 86400000).toISOString().split('T')[0];
            const guests = localStorage.getItem('bookingGuests') || '2';
            
            let bookingUrl = `/user/booking.html?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`; 
            window.location.href = bookingUrl;
        });
    }
});

async function loadRoomDetail(id) {
    try {
        // Use roomAPI from api.js if available, otherwise fallback to direct fetch
        if (typeof roomAPI !== 'undefined' && roomAPI.getRoomById) {
            const room = await roomAPI.getRoomById(id);
            renderRoomData(room);
        } else {
            // Fallback: Use API_CONFIG or direct fetch
            const API_GATEWAY_URL = typeof API_CONFIG !== 'undefined' ? API_CONFIG.GATEWAY : 'http://localhost:8000';
            const response = await fetch(`${API_GATEWAY_URL}/api/rooms/${id}`, {
                headers: {
                    'Authorization': `Bearer ${getToken ? getToken() : ''}`
                }
            });
            
            if (!response.ok) {
                throw new Error("Không tìm thấy phòng");
            }

            const room = await response.json();
            renderRoomData(room);
        }

    } catch (error) {
        console.error("Lỗi:", error);
        document.querySelector(".room-detail-main").innerHTML = "<h2>Không tải được thông tin phòng. Vui lòng thử lại sau.</h2>";
    }
}


function renderRoomData(room) {
    // 3. Điền dữ liệu vào các thẻ HTML dựa theo ID
    
    // Hình ảnh
    const imgElement = document.getElementById("roomMainImage");
    if (imgElement) {
        // Nếu room.mainImageUrl null thì dùng ảnh mặc định
        imgElement.src = room.mainImageUrl ? room.mainImageUrl : '/images/rooms/default-room.jpg';
    }

    // Tên phòng & Loại phòng
    setText("roomName", room.name);
    setText("roomTypePill", room.roomType);
    setText("bookingRoomType", room.roomType); // Ở cột bên phải

    // Giá tiền
    setText("bookingPrice", formatCurrency(room.pricePerNight));

    // Số người & Diện tích (Giả sử diện tích cứng hoặc thêm vào DB sau)
    setText("roomGuests", `Guests: ${room.capacity}`);
    setText("bookingGuests", `${room.capacity} persons`);

    // Mô tả
    setText("roomDescription", room.description);

    // Rating
    if (room.rating) {
        setText("roomRatingText", `${room.rating} / 5.0`);
    }

    // Cập nhật Title trang web
    document.title = `${room.name} - Chi tiết phòng`;
}

// Hàm hỗ trợ gán text an toàn (tránh lỗi nếu ID không tồn tại)
function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = value;
    }
}

// Hàm format tiền tệ (VND hoặc USD) - bỏ phần .00
function formatCurrency(amount) {
    return '$' + Math.round(amount).toLocaleString('en-US');
    // Nếu muốn VND: 
    // return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

// ----- GỌI API -----
async function fetchRooms(params) {
  const grid = $("roomGrid");
  const subtitle = $("roomSectionSubtitle");
  if (!grid) return;

  grid.innerHTML = "<p>Loading rooms...</p>";
  if (subtitle) subtitle.textContent = "Search results";

  let url = `${apiBase}/rooms/search`;
  if (params && params.toString()) {
    url += "?" + params.toString();
  }

  try {
    let res = await fetch(url);
    if (!res.ok) {
      // nếu search chưa làm xong / bị 404 thì fallback về featured
      console.warn("search rooms error, fallback to /rooms/featured", res.status);
      res = await fetch(`${apiBase}/rooms/featured`);
      if (subtitle) subtitle.textContent = "Featured rooms";
    }

    if (!res.ok) throw new Error("HTTP " + res.status);

    const rooms = await res.json();
    allRooms = Array.isArray(rooms) ? rooms : [];
    currentPage = 1;
    renderCurrentPage();
  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>Error loading rooms</p>";
  }
}

// ----- RENDER ROOMS THEO PAGE -----
function renderCurrentPage() {
  const grid = $("roomGrid");
  const pagination = $("pagination");
  if (!grid || !pagination) return;

  if (!allRooms.length) {
    grid.innerHTML = "<p>No rooms found.</p>";
    pagination.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(allRooms.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const rooms = allRooms.slice(start, end);

  // render cards
  grid.innerHTML = "";
  rooms.forEach((room) => {
    const card = document.createElement("div");
    card.className = "room-card";
    card.innerHTML = `
      <div class="room-image-wrapper">
        <img
          src="${room.mainImageUrl || "/images/rooms/default-room.jpg"}"
          alt="${room.name || "Room"}"
          class="room-image"
        />
        <div class="room-rating">
          <i class="fa-solid fa-star"></i>
          <span>${room.rating ?? "4.5"}</span>
        </div>
      </div>
      <div class="room-body">
        <h3 class="room-name">${room.name || "Room"}</h3>
        <p class="room-meta">
          ${room.capacity || 2} Guests • ${room.sizeSqm || 30} m²
        </p>
        <div class="room-tags">
          <span>WiFi</span>
          <span>TV</span>
          <span>Spa</span>
        </div>
        <div class="room-footer">
          <div class="room-price">
            <span class="price">$${room.pricePerNight || 120}</span>
            <span class="per-night">/ night</span>
          </div>
          <button class="btn-book" data-room-id="${room.id}">
            Book Now
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // gắn sự kiện Book Now → chi tiết phòng
  grid.querySelectorAll(".btn-book").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-room-id");
      if (id) {
        window.location.href = `/user/room-detail.html?id=${id}`;
      }
    });
  });

  // render pagination
  renderPagination(totalPages);
}

// ----- RENDER PAGINATION -----
function renderPagination(totalPages) {
  const container = $("pagination");
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  // Prev
  if (currentPage > 1) {
    html += `<button class="page-btn" data-page="${currentPage - 1}">&laquo;</button>`;
  }

  // Hiển thị tối đa 5 trang: 1 2 3 4 5
  const maxDisplay = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxDisplay - 1);

  // chỉnh lại start nếu gần cuối
  start = Math.max(1, end - maxDisplay + 1);

  if (start > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (start > 2) {
      html += `<span class="page-ellipsis">...</span>`;
    }
  }

  for (let p = start; p <= end; p++) {
    html += `
      <button
        class="page-btn ${p === currentPage ? "active" : ""}"
        data-page="${p}"
      >
        ${p}
      </button>
    `;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      html += `<span class="page-ellipsis">...</span>`;
    }
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  // Next
  if (currentPage < totalPages) {
    html += `<button class="page-btn" data-page="${currentPage + 1}">&raquo;</button>`;
  }

  container.innerHTML = html;

  container.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const page = parseInt(e.currentTarget.getAttribute("data-page"), 10);
      if (!isNaN(page) && page !== currentPage) {
        currentPage = page;
        renderCurrentPage();
      }
    });
  });
}
