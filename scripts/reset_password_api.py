#!/usr/bin/env python3
"""
Script to reset user password via API
Usage: python reset_password_api.py <username> <new_password>
"""
import sys
import requests

def main():
    if len(sys.argv) != 3:
        print("Usage: python reset_password_api.py <username> <new_password>")
        print("Example: python reset_password_api.py vuong vuong123")
        sys.exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    
    # Reset password via API Gateway
    url = f"http://localhost:8000/auth/reset-password"
    data = {
        "username": username,
        "new_password": new_password
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print("✅ Password reset successfully!")
            print(f"User: {username}")
            print(f"New password: {new_password}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to auth-service. Make sure it's running on port 8001")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()

