#!/usr/bin/env python3
"""
Script to reset passwords for all users in auth_db
"""
import sys
import os
import bcrypt

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def main():
    # Users to reset
    users = [
        {'username': 'admin', 'email': 'admin@gmail.com', 'password': 'admin1230'},
        {'username': 'vuong', 'email': 'vuong@gmail.com', 'password': 'vuong123'},
    ]
    
    print("=" * 60)
    print("Password Reset SQL Statements")
    print("=" * 60)
    
    for user in users:
        hashed = hash_password(user['password'])
        print(f"\n-- Reset password for {user['username']} ({user['email']})")
        print(f"UPDATE users")
        print(f"SET hashed_password = '{hashed}',")
        print(f"    is_active = TRUE,")
        print(f"    updated_at = NOW()")
        print(f"WHERE username = '{user['username']}' OR email = '{user['email']}';")
        print(f"-- Password: {user['password']}")
        print(f"-- Hash length: {len(hashed)}")
    
    print("\n" + "=" * 60)
    print("To apply:")
    print("1. Connect: mysql -h localhost -P 3307 -u root -ppassword auth_db")
    print("2. Run the SQL statements above")
    print("=" * 60)

if __name__ == "__main__":
    main()

