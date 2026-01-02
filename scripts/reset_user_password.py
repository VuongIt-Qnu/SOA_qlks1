#!/usr/bin/env python3
"""
Script to reset user password in auth_db
Usage: python reset_user_password.py <username> <new_password>
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

from passlib.context import CryptContext

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

def main():
    if len(sys.argv) != 3:
        print("Usage: python reset_user_password.py <username> <new_password>")
        print("Example: python reset_user_password.py vuong newpassword123")
        sys.exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    
    # Hash the new password
    hashed_password = hash_password(new_password)
    
    # Generate SQL update statement
    sql = f"""
UPDATE users 
SET hashed_password = '{hashed_password}',
    is_active = TRUE,
    updated_at = NOW()
WHERE username = '{username}' OR email = '{username}';
"""
    
    print("=" * 60)
    print("Password Reset SQL for user:", username)
    print("=" * 60)
    print(sql)
    print("=" * 60)
    print("\nTo apply this change:")
    print("1. Connect to MySQL:")
    print("   mysql -h localhost -P 3307 -u root -ppassword auth_db")
    print("\n2. Run the SQL statement above")
    print("\n3. Or use MySQL Workbench to connect and run the SQL")
    print("=" * 60)

if __name__ == "__main__":
    main()

