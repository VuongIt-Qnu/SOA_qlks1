#!/bin/bash

# Script để fix lỗi InnoDB corruption trong MySQL containers
# Sử dụng script này khi MySQL container không thể khởi động do lỗi InnoDB

echo "========================================"
echo "Fix MySQL InnoDB Corruption"
echo "========================================"
echo ""
echo "Script này sẽ:"
echo "1. Dừng tất cả containers"
echo "2. Xóa volume của database bị lỗi (nếu cần)"
echo "3. Khởi động lại containers"
echo ""
echo "LƯU Ý: Việc xóa volume sẽ mất tất cả dữ liệu trong database!"
echo ""

read -p "Bạn có muốn tiếp tục? (y/n): " choice
if [[ ! "$choice" =~ ^[Yy]$ ]]; then
    echo "Đã hủy."
    exit 0
fi

echo ""
echo "Đang dừng tất cả containers..."
docker-compose down

echo ""
echo "Danh sách các MySQL volumes:"
docker volume ls | grep "_db_data"

echo ""
read -p "Nhập tên volume cần xóa (ví dụ: soa_qlks_booking_db_data) hoặc 'all' để xóa tất cả: " volume_name

if [[ "$volume_name" == "all" ]]; then
    echo "Đang xóa tất cả MySQL volumes..."
    docker volume rm soa_qlks_auth_db_data 2>/dev/null || true
    docker volume rm soa_qlks_customer_db_data 2>/dev/null || true
    docker volume rm soa_qlks_room_db_data 2>/dev/null || true
    docker volume rm soa_qlks_booking_db_data 2>/dev/null || true
    docker volume rm soa_qlks_payment_db_data 2>/dev/null || true
    docker volume rm soa_qlks_report_db_data 2>/dev/null || true
    echo "Đã xóa tất cả volumes."
else
    if [[ -n "$volume_name" ]]; then
        echo "Đang xóa volume: $volume_name"
        docker volume rm "$volume_name" || echo "Không thể xóa volume. Có thể volume không tồn tại hoặc đang được sử dụng."
    fi
fi

echo ""
echo "Đang khởi động lại containers..."
docker-compose up -d

echo ""
echo "Đang chờ MySQL containers khởi động..."
sleep 10

echo ""
echo "Kiểm tra trạng thái containers:"
docker-compose ps

echo ""
echo "========================================"
echo "Hoàn tất!"
echo "========================================"
echo ""
echo "Để kết nối MySQL Workbench:"
echo "- Auth DB:     localhost:3307 (user: root, password: password)"
echo "- Customer DB: localhost:3308 (user: root, password: password)"
echo "- Room DB:     localhost:3309 (user: root, password: password)"
echo "- Booking DB:  localhost:3310 (user: root, password: password)"
echo "- Payment DB:  localhost:3311 (user: root, password: password)"
echo "- Report DB:   localhost:3312 (user: root, password: password)"
echo ""

