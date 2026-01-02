#!/usr/bin/env python3
"""
Script để test tất cả các services
"""
import requests
import json
import sys
from typing import Optional

BASE_URL = "http://localhost"

def print_section(title: str):
    """Print section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def test_health_check(service_name: str, port: int) -> bool:
    """Test health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}:{port}/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ {service_name} is healthy")
            return True
        else:
            print(f"❌ {service_name} returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {service_name} is not responding: {e}")
        return False

def test_auth_service() -> Optional[str]:
    """Test Auth Service"""
    print_section("Testing Auth Service")
    
    try:
        # Test health
        test_health_check("Auth Service", 8001)
        
        # Register
        print("\n1. Testing Register...")
        response = requests.post(f"{BASE_URL}:8001/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User",
            "role_name": "customer"
        }, timeout=10)
        
        if response.status_code in [200, 201]:
            print(f"   ✅ Register successful")
            token = response.json().get("access_token")
        else:
            print(f"   ⚠️  Register returned {response.status_code}: {response.text[:100]}")
            # Try login instead
            print("\n2. Testing Login...")
            response = requests.post(f"{BASE_URL}:8001/login", json={
                "username": "testuser",
                "password": "password123"
            }, timeout=10)
            
            if response.status_code == 200:
                print(f"   ✅ Login successful")
                token = response.json().get("access_token")
            else:
                print(f"   ❌ Login failed: {response.status_code}")
                return None
        
        if token:
            print(f"   Token: {token[:30]}...")
            return token
        return None
        
    except Exception as e:
        print(f"❌ Auth Service test failed: {e}")
        return None

def test_customer_service(token: str) -> Optional[int]:
    """Test Customer Service"""
    print_section("Testing Customer Service")
    
    try:
        test_health_check("Customer Service", 8002)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create customer
        print("\n1. Creating customer...")
        response = requests.post(f"{BASE_URL}:8002/customers", json={
            "name": "Nguyễn Văn A",
            "email": "nguyenvana@example.com",
            "phone": "0123456789",
            "address": "123 Đường ABC, Quận 1, TP.HCM"
        }, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            customer_id = response.json().get("id")
            print(f"   ✅ Customer created with ID: {customer_id}")
        else:
            print(f"   ⚠️  Create customer returned {response.status_code}")
            customer_id = 1  # Assume ID 1 exists
        
        # Get customers
        print("\n2. Getting customers list...")
        response = requests.get(f"{BASE_URL}:8002/customers", headers=headers, timeout=10)
        if response.status_code == 200:
            customers = response.json()
            print(f"   ✅ Found {len(customers)} customers")
        else:
            print(f"   ❌ Get customers failed: {response.status_code}")
        
        return customer_id
        
    except Exception as e:
        print(f"❌ Customer Service test failed: {e}")
        return None

def test_room_service(token: str) -> Optional[int]:
    """Test Room Service"""
    print_section("Testing Room Service")
    
    try:
        test_health_check("Room Service", 8003)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get room types first
        print("\n1. Getting room types...")
        response = requests.get(f"{BASE_URL}:8003/room-types", headers=headers, timeout=10)
        if response.status_code == 200:
            room_types = response.json()
            print(f"   ✅ Found {len(room_types)} room types")
            if room_types:
                room_type_id = room_types[0].get("id")
            else:
                # Create room type
                print("\n2. Creating room type...")
                response = requests.post(f"{BASE_URL}:8003/room-types", json={
                    "name": "Phòng Đơn",
                    "description": "Phòng đơn tiêu chuẩn",
                    "price_per_night": 500000,
                    "max_occupancy": 1,
                    "amenities": "WiFi, TV, Điều hòa"
                }, headers=headers, timeout=10)
                if response.status_code in [200, 201]:
                    room_type_id = response.json().get("id")
                    print(f"   ✅ Room type created with ID: {room_type_id}")
                else:
                    print(f"   ❌ Create room type failed: {response.status_code}")
                    return None
        else:
            print(f"   ❌ Get room types failed: {response.status_code}")
            return None
        
        # Get rooms
        print("\n3. Getting rooms...")
        response = requests.get(f"{BASE_URL}:8003/rooms", headers=headers, timeout=10)
        if response.status_code == 200:
            rooms = response.json()
            print(f"   ✅ Found {len(rooms)} rooms")
            if rooms:
                room_id = rooms[0].get("id")
            else:
                # Create room
                print("\n4. Creating room...")
                response = requests.post(f"{BASE_URL}:8003/rooms", json={
                    "room_number": "101",
                    "room_type_id": room_type_id,
                    "status": "available",
                    "floor": 1
                }, headers=headers, timeout=10)
                if response.status_code in [200, 201]:
                    room_id = response.json().get("id")
                    print(f"   ✅ Room created with ID: {room_id}")
                else:
                    print(f"   ❌ Create room failed: {response.status_code}")
                    return None
        else:
            print(f"   ❌ Get rooms failed: {response.status_code}")
            return None
        
        return room_id
        
    except Exception as e:
        print(f"❌ Room Service test failed: {e}")
        return None

def test_booking_service(token: str, customer_id: int, room_id: int) -> Optional[int]:
    """Test Booking Service"""
    print_section("Testing Booking Service")
    
    try:
        test_health_check("Booking Service", 8004)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create booking
        print("\n1. Creating booking...")
        response = requests.post(f"{BASE_URL}:8004/bookings", json={
            "customer_id": customer_id,
            "room_id": room_id,
            "check_in": "2026-01-10",
            "check_out": "2026-01-12",
            "guests": 2,
            "special_requests": "Phòng view đẹp"
        }, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            booking_id = response.json().get("id")
            print(f"   ✅ Booking created with ID: {booking_id}")
        else:
            print(f"   ❌ Create booking failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return None
        
        # Get bookings
        print("\n2. Getting bookings list...")
        response = requests.get(f"{BASE_URL}:8004/bookings", headers=headers, timeout=10)
        if response.status_code == 200:
            bookings = response.json()
            print(f"   ✅ Found {len(bookings)} bookings")
        
        return booking_id
        
    except Exception as e:
        print(f"❌ Booking Service test failed: {e}")
        return None

def test_payment_service(token: str, booking_id: int):
    """Test Payment Service"""
    print_section("Testing Payment Service")
    
    try:
        test_health_check("Payment Service", 8005)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create payment
        print("\n1. Creating payment...")
        response = requests.post(f"{BASE_URL}:8005/payments", json={
            "booking_id": booking_id,
            "amount": 1000000,
            "payment_method": "cash",
            "payment_status": "pending"
        }, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            payment_data = response.json()
            payment_id = payment_data.get("id")
            print(f"   ✅ Payment created with ID: {payment_id}")
            if payment_data.get("invoice"):
                print(f"   ✅ Invoice created: {payment_data['invoice'].get('invoice_number')}")
        else:
            print(f"   ❌ Create payment failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return
        
        # Get payments
        print("\n2. Getting payments list...")
        response = requests.get(f"{BASE_URL}:8005/payments", headers=headers, timeout=10)
        if response.status_code == 200:
            payments = response.json()
            print(f"   ✅ Found {len(payments)} payments")
        
    except Exception as e:
        print(f"❌ Payment Service test failed: {e}")

def test_report_service(token: str):
    """Test Report Service"""
    print_section("Testing Report Service")
    
    try:
        test_health_check("Report Service", 8006)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get revenue report
        print("\n1. Getting revenue report...")
        response = requests.get(f"{BASE_URL}:8006/reports/revenue?period=month", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Revenue report: Total = {data.get('total_revenue', 0)}")
        else:
            print(f"   ⚠️  Revenue report returned {response.status_code}")
        
        # Get dashboard
        print("\n2. Getting dashboard...")
        response = requests.get(f"{BASE_URL}:8006/reports/dashboard", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Dashboard data retrieved")
            if data.get("rooms"):
                print(f"   - Total rooms: {data['rooms'].get('total_rooms', 0)}")
            if data.get("bookings"):
                print(f"   - Total bookings: {data['bookings'].get('total_bookings', 0)}")
        else:
            print(f"   ⚠️  Dashboard returned {response.status_code}")
        
    except Exception as e:
        print(f"❌ Report Service test failed: {e}")

def main():
    """Main test function"""
    print("="*60)
    print("  SOA Hotel Management System - Service Tests")
    print("="*60)
    
    # Test all health checks first
    print_section("Health Checks")
    services = [
        ("Auth Service", 8001),
        ("Customer Service", 8002),
        ("Room Service", 8003),
        ("Booking Service", 8004),
        ("Payment Service", 8005),
        ("Report Service", 8006),
    ]
    
    all_healthy = True
    for name, port in services:
        if not test_health_check(name, port):
            all_healthy = False
    
    if not all_healthy:
        print("\n⚠️  Some services are not healthy. Please check docker-compose logs.")
        sys.exit(1)
    
    # Run functional tests
    token = test_auth_service()
    if not token:
        print("\n❌ Cannot get authentication token. Aborting tests.")
        sys.exit(1)
    
    customer_id = test_customer_service(token)
    if not customer_id:
        print("\n⚠️  Customer service test failed. Continuing with other tests...")
        customer_id = 1
    
    room_id = test_room_service(token)
    if not room_id:
        print("\n⚠️  Room service test failed. Cannot test booking.")
        return
    
    booking_id = test_booking_service(token, customer_id, room_id)
    if booking_id:
        test_payment_service(token, booking_id)
    
    test_report_service(token)
    
    print_section("Test Summary")
    print("✅ All tests completed!")
    print("\n💡 Tips:")
    print("   - Check Swagger UI at http://localhost:{port}/docs")
    print("   - Check database: docker exec -it {service}-db mysql -uroot -ppassword")
    print("   - View logs: docker logs {service-name}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

