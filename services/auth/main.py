"""
Auth Service - Authentication and Authorization Service
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional
import sys
import os

# Add parent directory to path to import shared modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from database import get_db, Base, engine
from shared.utils.jwt_handler import create_access_token, verify_token
from shared.common.dependencies import get_current_user
from models import User, Role
from schemas import UserCreate, UserUpdate, UserLogin, Token, UserResponse, RoleCreate, RoleResponse

app = FastAPI(
    title="Auth Service",
    description="Authentication and Authorization Service for Hotel Management System",
    version="1.0.0"
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize default roles
def init_default_roles(db: Session):
    """Initialize default roles if they don't exist"""
    default_roles = [
        {"name": "admin", "description": "Quản trị viên - Toàn quyền"},
        {"name": "manager", "description": "Quản lý - Quản lý hệ thống"},
        {"name": "receptionist", "description": "Lễ tân - Tiếp nhận và xử lý đặt phòng"},
        {"name": "customer", "description": "Khách hàng - Người dùng thông thường"}
    ]
    
    for role_data in default_roles:
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing_role:
            role = Role(**role_data)
            db.add(role)
    
    db.commit()

# Initialize roles on startup
@app.on_event("startup")
async def startup_event():
    db = next(get_db())
    try:
        init_default_roles(db)
    finally:
        db.close()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security scheme
security = HTTPBearer()

# Import password hashing utilities
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt (handles MySQL truncation issue)"""
    # Convert password to bytes
    password_bytes = password.encode('utf-8')
    
    # Limit password to 72 bytes for bcrypt (bcrypt limitation)
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against hashed password (handles MySQL truncation issue)"""
    try:
        # Convert to bytes
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        hash_bytes = hashed_password.encode('utf-8')
        
        # Verify password
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except (ValueError, TypeError, Exception) as e:
        # Hash format is invalid (e.g., truncated or corrupted)
        print(f"Password verification error: {e}")
        return False

def get_user_roles(user: User, db: Session) -> List[str]:
    """Get list of role names for user"""
    # Refresh user to get latest roles from database
    db.refresh(user)
    return [role.name for role in user.roles]

def authenticate_user(username: str, password: str, db: Session) -> Optional[User]:
    """Authenticate user with username/email and password"""
    user = db.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    if not user.is_active:
        return None
    
    return user

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {"service": "auth", "status": "running"}

@app.post("/login", response_model=Token, tags=["Authentication"])
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """User login endpoint"""
    user = authenticate_user(user_data.username, user_data.password, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user roles
    roles = get_user_roles(user, db)
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "username": user.username,
            "email": user.email,
            "roles": roles
        }
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@app.post("/verify-token", tags=["Authentication"])
async def verify_token_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Verify JWT token endpoint"""
    return {
        "valid": True,
        "user": current_user
    }

@app.get("/users", response_model=List[UserResponse], tags=["Users"])
async def get_users(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    # Check admin role
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can view all users"
        )
    
    users = db.query(User).all()
    return [UserResponse.model_validate(user) for user in users]

@app.get("/me", response_model=UserResponse, tags=["Authentication"])
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current authenticated user information"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)

@app.get("/users/me", response_model=UserResponse, tags=["Users"])
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information (Alias for /me)"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)

@app.get("/users/{user_id}", response_model=UserResponse, tags=["Users"])
async def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID (Admin or self)"""
    # Check if admin or self
    user_roles = current_user.get("roles", [])
    current_user_id = int(current_user.get("sub"))
    
    if "admin" not in user_roles and current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)

@app.post("/register", response_model=Token, tags=["Authentication"])
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user
    
    - **username**: Unique username
    - **email**: User email
    - **password**: User password
    - **full_name**: Full name of user
    - **role_name**: Role name (default: customer)
    """
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Get or create role
    role = db.query(Role).filter(Role.name == user_data.role_name).first()
    if not role:
        # If role doesn't exist, default to customer
        role = db.query(Role).filter(Role.name == "customer").first()
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        is_active=True
    )
    
    db.add(new_user)
    db.flush()  # Flush to get user ID
    
    # Assign role
    if role:
        new_user.roles.append(role)
    
    db.commit()
    db.refresh(new_user)
    
    # Create access token with roles
    roles = [r.name for r in new_user.roles]
    access_token = create_access_token(
        data={
            "sub": str(new_user.id),  # JWT requires sub to be a string
            "username": new_user.username,
            "email": new_user.email,
            "roles": roles
        }
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@app.post("/users", response_model=UserResponse, tags=["Users"])
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new user (Admin only)"""
    # Check admin role
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create users"
        )
    
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Get or create role
    role = db.query(Role).filter(Role.name == user_data.role_name).first()
    if not role:
        role = db.query(Role).filter(Role.name == "customer").first()
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        is_active=True
    )
    
    db.add(user)
    db.flush()
    
    # Assign role
    if role:
        user.roles.append(role)
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)

@app.put("/users/{user_id}", response_model=UserResponse, tags=["Users"])
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user (Admin or self)"""
    # Check if admin or self
    user_roles = current_user.get("roles", [])
    current_user_id = int(current_user.get("sub"))
    
    if "admin" not in user_roles and current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user (Admin only)
    """
    # Check admin role
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can delete users"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting yourself
    if user.id == int(current_user.get("sub")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    return None

@app.post("/roles", response_model=RoleResponse, tags=["Roles"])
async def create_role(
    role_data: RoleCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new role (Admin only)"""
    # Check admin role
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create roles"
        )
    
    # Check if role already exists
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already exists"
        )
    
    role = Role(
        name=role_data.name,
        description=role_data.description
    )
    
    db.add(role)
    db.commit()
    db.refresh(role)
    
    return RoleResponse.model_validate(role)

@app.get("/roles", response_model=List[RoleResponse], tags=["Roles"])
async def get_roles(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all roles (Admin only)"""
    # Check admin role
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can view roles"
        )
    
    roles = db.query(Role).all()
    return [RoleResponse.model_validate(role) for role in roles]

@app.post("/users/{user_id}/roles/{role_id}", tags=["Users"])
async def assign_role_to_user(
    user_id: int,
    role_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign role to user (Admin only)"""
    # Check admin role
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can assign roles"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    role = db.query(Role).filter(Role.id == role_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if role already assigned
    if role in user.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already assigned to user"
        )
    
    user.roles.append(role)
    db.commit()
    
    return {"message": f"Role {role.name} assigned to user {user.username}"}

    
@app.post("/change-password", tags=["Authentication"])
async def change_password(
    current_password: str,
    new_password: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    user.hashed_password = hash_password(new_password)
    user.is_active = True
    db.commit()
    db.refresh(user)
    
    return {"message": "Password changed successfully"}

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
