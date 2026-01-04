document.addEventListener("DOMContentLoaded", function () {
    const apiBase = "http://localhost:8080/api";
    
    // 1. Lấy tham số từ URL
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('id');
    
    // Lấy thông tin ngày tháng (nếu khách đã chọn từ trang trước)
    // Nếu không có, ta sẽ lấy ngày hiện tại làm mặc định để không bị lỗi link
    const checkIn = params.get('checkIn') || new Date().toISOString().split('T')[0];
    const checkOut = params.get('checkOut') || new Date(Date.now() + 86400000).toISOString().split('T')[0]; // +1 ngày
    const guests = params.get('guests') || "2";

    if (!roomId) {
        alert("Không tìm thấy ID phòng!");
        window.location.href = "/"; 
        return;
    }

    // 2. Gọi API lấy chi tiết phòng
    fetchRoomDetail(roomId);

    // 3. Xử lý nút "Book This Room"
    const bookBtn = document.getElementById("bookThisRoomBtn");
    
    if (bookBtn) {
        console.log("Đã tìm thấy nút Book This Room"); // Kiểm tra xem JS có tìm thấy nút không
        
        bookBtn.addEventListener("click", function() {
            console.log("Đã bấm nút!"); // Kiểm tra xem sự kiện click có chạy không

            // Tạo đường dẫn sang trang Booking
            // QUAN TRỌNG: Phải đúng đường dẫn /user/booking.html
            let bookingUrl = `/user/booking.html?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
            
            console.log("Chuyển hướng đến:", bookingUrl);
            window.location.href = bookingUrl;
        });
    } else {
        console.error("Lỗi: Không tìm thấy nút có id='bookThisRoomBtn' trong HTML");
    }
});

async function fetchRoomDetail(id) {
    try {
        const response = await fetch(`http://localhost:8080/api/rooms/${id}`);
        if (!response.ok) throw new Error("Phòng không tồn tại");

        const room = await response.json();
        renderRoomData(room);

    } catch (error) {
        console.error("Lỗi:", error);
        document.querySelector(".room-detail-main").innerHTML = `<p class="error-msg">${error.message}</p>`;
    }
}

function renderRoomData(room) {
    // Render Hình ảnh
    const imgElement = document.getElementById("roomMainImage");
    if (imgElement) {
        imgElement.src = room.mainImageUrl || '/images/rooms/default-room.jpg';
        imgElement.onerror = function() { this.src = '/images/rooms/default-room.jpg'; };
    }

    // Render Text cơ bản
    setText("roomName", room.name);
    setText("roomTypePill", room.roomType);
    setText("bookingRoomType", room.roomType); 

    // Render Giá tiền
    const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(room.pricePerNight);
    setText("bookingPrice", price);

    // Render thông tin khác
    setText("roomGuests", `Up to ${room.capacity} guests`);
    setText("bookingGuests", `${room.capacity} persons`);
    setText("roomDescription", room.description || "No description provided.");
    
    if (room.rating) setText("roomRatingText", `${room.rating} / 5.0`);
    
    document.title = `${room.name} - Chi tiết`;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
