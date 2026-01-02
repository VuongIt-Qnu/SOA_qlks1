# Hướng dẫn Setup Database cho Dự án SOA_QLKS

## Tổng quan

Dự án sử dụng 6 MySQL databases riêng biệt cho từng service:

| Service | Database | Port | File SQL |
|---------|----------|------|----------|
| Auth | `auth_db` | 3307 | `services/auth/auth_db.sql` |
| Customer | `customer_db` | 3308 | `services/customer/customer_db.sql` |
| Room | `room_db` | 3309 | `services/room/room_db.sql` |
| Booking | `booking_db` | 3310 | `services/booking/booking_db.sql` |
| Payment | `payment_db` | 3311 | `services/payment/payment_db.sql` |
| Report | `report_db` | 3312 | `services/report/report_db.sql` |

## Thông tin kết nối

- **Host:** `localhost`
- **Username:** `root`
- **Password:** `password`
- **Port:** Xem bảng trên

## Cách Setup Database

### Phương pháp 1: Sử dụng Script Tự động (Khuyến nghị)

#### Bước 1: Khởi động containers
```bash
docker-compose up -d
```

#### Bước 2: Chạy script setup
**Trên Windows:**
```bash
scripts\setup_databases.bat
```

**Trên Linux/Mac:**
```bash
chmod +x scripts/setup_databases.sh
./scripts/setup_databases.sh
```

Script sẽ tự động:
- Kiểm tra containers đang chạy
- Đợi MySQL khởi động hoàn toàn
- Import tất cả các file SQL vào containers tương ứng

### Phương pháp 2: Import thủ công trong MySQL Workbench

#### Bước 1: Kết nối đến từng database

1. Mở MySQL Workbench
2. Tạo connection mới cho mỗi database:
   - **Connection Name:** `Auth DB`, `Customer DB`, etc.
   - **Hostname:** `localhost`
   - **Port:** `3307`, `3308`, `3309`, `3310`, `3311`, `3312` (tương ứng)
   - **Username:** `root`
   - **Password:** `password`
   - **Default Schema:** `auth_db`, `customer_db`, etc. (tương ứng)

#### Bước 2: Import SQL Schema

Cho mỗi database:

1. Kết nối đến database tương ứng
2. Mở file SQL:
   - `File` → `Open SQL Script...`
   - Chọn file SQL tương ứng từ thư mục `services/[service-name]/[service-name]_db.sql`
3. Chạy script:
   - Click nút `⚡` (Execute) hoặc nhấn `Ctrl+Shift+Enter`

### Phương pháp 3: Import tất cả cùng lúc

Sử dụng file `scripts/setup_all_databases.sql`:

1. Kết nối đến bất kỳ database nào (ví dụ: Auth DB)
2. Mở file `scripts/setup_all_databases.sql`
3. Chạy script - nó sẽ tạo tất cả databases và tables

## Cấu trúc Database

### 1. Auth DB (`auth_db`)

**Tables:**
- `users` - Thông tin người dùng
- `roles` - Vai trò trong hệ thống
- `user_roles` - Liên kết user và role

**Default Data:**
- 4 roles: `admin`, `manager`, `receptionist`, `customer`
- 1 admin user: `admin` / `admin123`

### 2. Customer DB (`customer_db`)

**Tables:**
- `customers` - Thông tin khách hàng
- `customer_profiles` - Hồ sơ chi tiết khách hàng

### 3. Room DB (`room_db`)

**Tables:**
- `room_types` - Loại phòng
- `rooms` - Danh sách phòng

**Default Data:**
- 3 room types: `Standard`, `Deluxe`, `Suite`

### 4. Booking DB (`booking_db`)

**Tables:**
- `bookings` - Đặt phòng
- `booking_details` - Chi tiết dịch vụ kèm theo

### 5. Payment DB (`payment_db`)

**Tables:**
- `payments` - Thanh toán
- `invoices` - Hóa đơn

### 6. Report DB (`report_db`)

**Tables:**
- `reports` - Báo cáo đã tạo (cache)

## Kiểm tra Setup

### Kiểm tra trong MySQL Workbench

1. Kết nối đến từng database
2. Kiểm tra tables đã được tạo:
   ```sql
   SHOW TABLES;
   ```
3. Kiểm tra dữ liệu mẫu (nếu có):
   ```sql
   SELECT * FROM roles;  -- Auth DB
   SELECT * FROM room_types;  -- Room DB
   ```

### Kiểm tra bằng Docker

```bash
# Xem logs của container
docker-compose logs booking-db

# Kiểm tra database trong container
docker exec -it booking-db mysql -uroot -ppassword -e "SHOW DATABASES;"
docker exec -it booking-db mysql -uroot -ppassword -e "USE booking_db; SHOW TABLES;"
```

## Troubleshooting

### Lỗi: "Table already exists"

Nếu table đã tồn tại, bạn có thể:
1. Xóa và tạo lại:
   ```sql
   DROP TABLE IF EXISTS table_name;
   ```
2. Hoặc sử dụng `CREATE TABLE IF NOT EXISTS` (đã có trong các file SQL)

### Lỗi: "Cannot connect to MySQL server"

1. Kiểm tra container đang chạy:
   ```bash
   docker ps | grep _db
   ```
2. Kiểm tra logs:
   ```bash
   docker-compose logs booking-db
   ```
3. Đợi MySQL khởi động hoàn toàn (có thể mất 30-60 giây)

### Lỗi: "Access denied"

- Kiểm tra lại username/password: `root` / `password`
- Đảm bảo đang kết nối đúng port

### Lỗi: "Database does not exist"

Chạy lại script setup hoặc tạo database thủ công:
```sql
CREATE DATABASE IF NOT EXISTS booking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Reset Database (Xóa và tạo lại)

### Cách 1: Sử dụng script fix corruption

```bash
scripts\fix_mysql_corruption.bat  # Windows
./scripts/fix_mysql_corruption.sh  # Linux/Mac
```

### Cách 2: Thủ công

1. Dừng containers:
   ```bash
   docker-compose down
   ```

2. Xóa volumes:
   ```bash
   docker volume rm soa_qlks_auth_db_data
   docker volume rm soa_qlks_customer_db_data
   docker volume rm soa_qlks_room_db_data
   docker volume rm soa_qlks_booking_db_data
   docker volume rm soa_qlks_payment_db_data
   docker volume rm soa_qlks_report_db_data
   ```

3. Khởi động lại và setup:
   ```bash
   docker-compose up -d
   scripts\setup_databases.bat  # Windows
   ```

## Backup và Restore

### Backup một database

```bash
docker exec booking-db mysqldump -uroot -ppassword booking_db > backup_booking_db.sql
```

### Restore một database

```bash
docker exec -i booking-db mysql -uroot -ppassword booking_db < backup_booking_db.sql
```

### Backup tất cả databases

```bash
# Windows
for /f "tokens=*" %i in ('docker ps --format "{{.Names}}" ^| findstr "_db"') do docker exec %i mysqldump -uroot -ppassword --all-databases > backup_%i.sql

# Linux/Mac
for container in $(docker ps --format "{{.Names}}" | grep "_db"); do
    docker exec $container mysqldump -uroot -ppassword --all-databases > backup_${container}.sql
done
```

## Lưu ý quan trọng

1. **Character Set:** Tất cả databases sử dụng `utf8mb4` để hỗ trợ tiếng Việt
2. **Engine:** Tất cả tables sử dụng `InnoDB` để hỗ trợ foreign keys và transactions
3. **Ports:** Mỗi database có port riêng để tránh xung đột
4. **Volumes:** Dữ liệu được lưu trong Docker volumes, không mất khi restart container
5. **Default User:** Admin user mặc định: `admin` / `admin123` (nên đổi trong production)

## Liên kết hữu ích

- [README MySQL Workbench](scripts/README_MYSQL_WORKBENCH.md) - Hướng dẫn chi tiết về MySQL Workbench
- [Fix MySQL Corruption](scripts/fix_mysql_corruption.bat) - Script fix lỗi InnoDB corruption

