# Hướng dẫn kết nối MySQL Workbench với Docker Containers

## Vấn đề InnoDB Corruption

Lỗi InnoDB corruption thường xảy ra khi:
- Container MySQL bị dừng đột ngột (kill, restart, shutdown không đúng cách)
- Volume bị corrupt do lỗi hệ thống
- Dữ liệu không được ghi đúng cách trước khi container dừng

## Giải pháp nhanh

### Cách 1: Sử dụng script tự động (Khuyến nghị)

**Trên Windows:**
```bash
scripts\fix_mysql_corruption.bat
```

**Trên Linux/Mac:**
```bash
chmod +x scripts/fix_mysql_corruption.sh
./scripts/fix_mysql_corruption.sh
```

Script sẽ:
1. Dừng tất cả containers
2. Cho phép bạn chọn volume cần xóa (hoặc xóa tất cả)
3. Khởi động lại containers với database mới

**LƯU Ý:** Xóa volume sẽ mất tất cả dữ liệu. Hãy backup trước nếu cần!

### Cách 2: Fix thủ công

1. **Dừng containers:**
   ```bash
   docker-compose down
   ```

2. **Xóa volume bị lỗi (ví dụ: booking-db):**
   ```bash
   docker volume rm soa_qlks_booking_db_data
   ```
   
   Hoặc xóa tất cả MySQL volumes:
   ```bash
   docker volume rm soa_qlks_auth_db_data
   docker volume rm soa_qlks_customer_db_data
   docker volume rm soa_qlks_room_db_data
   docker volume rm soa_qlks_booking_db_data
   docker volume rm soa_qlks_payment_db_data
   docker volume rm soa_qlks_report_db_data
   ```

3. **Khởi động lại:**
   ```bash
   docker-compose up -d
   ```

4. **Chờ MySQL khởi động (khoảng 10-30 giây):**
   ```bash
   docker-compose logs -f booking-db
   ```

## Kết nối MySQL Workbench

### Thông tin kết nối

| Database | Host | Port | Username | Password | Database Name |
|----------|------|------|----------|----------|---------------|
| Auth DB | localhost | 3307 | root | password | auth_db |
| Customer DB | localhost | 3308 | root | password | customer_db |
| Room DB | localhost | 3309 | root | password | room_db |
| Booking DB | localhost | 3310 | root | password | booking_db |
| Payment DB | localhost | 3311 | root | password | payment_db |
| Report DB | localhost | 3312 | root | password | report_db |

### Các bước kết nối

1. **Mở MySQL Workbench**

2. **Tạo connection mới:**
   - Click vào dấu `+` bên cạnh "MySQL Connections"
   - Hoặc vào menu: `Database` → `Manage Connections...` → `New`

3. **Điền thông tin:**
   - **Connection Name:** `Booking DB` (hoặc tên bạn muốn)
   - **Hostname:** `localhost`
   - **Port:** `3310` (cho booking-db, hoặc port tương ứng với DB khác)
   - **Username:** `root`
   - **Password:** `password`
   - **Default Schema:** `booking_db` (hoặc schema tương ứng)

4. **Test Connection:**
   - Click `Test Connection` để kiểm tra
   - Nếu thành công, click `OK` để lưu

5. **Kết nối:**
   - Double-click vào connection vừa tạo để kết nối

### Import SQL Schema

### Cách 1: Sử dụng script tự động (Khuyến nghị)

**Trên Windows:**
```bash
scripts\setup_databases.bat
```

**Trên Linux/Mac:**
```bash
chmod +x scripts/setup_databases.sh
./scripts/setup_databases.sh
```

Script sẽ tự động import tất cả các file SQL vào các containers tương ứng.

### Cách 2: Import thủ công trong MySQL Workbench

Sau khi kết nối thành công, bạn có thể import schema:

1. **Mở file SQL:**
   - `File` → `Open SQL Script...`
   - Chọn file tương ứng:
     - `services/auth/auth_db.sql` cho Auth DB
     - `services/customer/customer_db.sql` cho Customer DB
     - `services/room/room_db.sql` cho Room DB
     - `services/booking/booking_db.sql` cho Booking DB
     - `services/payment/payment_db.sql` cho Payment DB
     - `services/report/report_db.sql` cho Report DB

2. **Chọn database:**
   - Trong Workbench, chọn database tương ứng từ dropdown (ví dụ: `booking_db`)

3. **Chạy script:**
   - Click nút `⚡` (Execute) hoặc `Ctrl+Shift+Enter`

### Cách 3: Import tất cả databases cùng lúc

Sử dụng file `scripts/setup_all_databases.sql`:
- Mở file này trong MySQL Workbench
- Kết nối đến bất kỳ database nào (ví dụ: Auth DB)
- Chạy script - nó sẽ tạo tất cả databases và tables

## Cải thiện đã thêm vào docker-compose.yml

Để tránh lỗi InnoDB corruption trong tương lai, tôi đã thêm:

1. **Healthcheck:** Kiểm tra MySQL container có hoạt động không
2. **Restart policy:** `unless-stopped` - tự động khởi động lại nếu container dừng
3. **Command flags:** Đảm bảo MySQL shutdown cleanly

## Troubleshooting

### Container không khởi động

```bash
# Xem logs
docker-compose logs booking-db

# Kiểm tra trạng thái
docker-compose ps

# Restart container
docker-compose restart booking-db
```

### Kết nối bị timeout

1. Kiểm tra container đang chạy:
   ```bash
   docker ps | grep booking-db
   ```

2. Kiểm tra port đã được mở:
   ```bash
   netstat -an | findstr 3310  # Windows
   # hoặc
   lsof -i :3310  # Linux/Mac
   ```

3. Đợi MySQL khởi động hoàn toàn (có thể mất 30-60 giây lần đầu)

### Lỗi "Access denied"

- Kiểm tra lại username/password
- Đảm bảo đang dùng `root` và `password` như trong docker-compose.yml

### Lỗi "Can't connect to MySQL server"

- Container chưa khởi động xong, đợi thêm vài giây
- Kiểm tra logs: `docker-compose logs booking-db`
- Thử restart: `docker-compose restart booking-db`

## Backup và Restore

### Backup database

```bash
docker exec booking-db mysqldump -u root -ppassword booking_db > backup_booking_db.sql
```

### Restore database

```bash
docker exec -i booking-db mysql -u root -ppassword booking_db < backup_booking_db.sql
```

