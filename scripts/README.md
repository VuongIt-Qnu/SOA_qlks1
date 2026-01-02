# 🔍 Service Health Check Scripts

Scripts để kiểm tra trạng thái của tất cả services và databases.

## 📋 Các Script

### 1. `check_services.py` (Python - Cross-platform)

**Yêu cầu:**
```bash
pip install requests pymysql
```

**Sử dụng:**
```bash
python scripts/check_services.py
```

**Hoặc:**
```bash
python3 scripts/check_services.py
```

### 2. `check_services.sh` (Bash - Linux/Mac)

**Sử dụng:**
```bash
chmod +x scripts/check_services.sh
./scripts/check_services.sh
```

### 3. `check_services.bat` (Windows Batch)

**Sử dụng:**
```cmd
scripts\check_services.bat
```

## 📊 Kết Quả

Scripts sẽ kiểm tra:

### Services:
- ✅ Auth Service (port 8001)
- ✅ Customer Service (port 8002)
- ✅ Room Service (port 8003)
- ✅ Booking Service (port 8004)
- ✅ Payment Service (port 8005)
- ✅ Report Service (port 8006)
- ✅ Frontend (port 3000)

### Databases:
- ✅ auth_db (port 3307)
- ✅ customer_db (port 3308)
- ✅ room_db (port 3309)
- ✅ booking_db (port 3310)
- ✅ payment_db (port 3311)
- ✅ report_db (port 3312)

## 🔧 Troubleshooting

### Python script không chạy:
```bash
# Cài đặt dependencies
pip install requests pymysql
```

### Bash script không chạy:
```bash
# Cấp quyền thực thi
chmod +x scripts/check_services.sh
```

### Windows script cần curl:
- Cài đặt curl hoặc sử dụng PowerShell
- Hoặc dùng Python script thay thế

## 💡 Sử dụng trong CI/CD

Có thể tích hợp vào CI/CD pipeline để tự động kiểm tra sau khi deploy:

```yaml
# Example GitHub Actions
- name: Check Services
  run: python scripts/check_services.py
```

