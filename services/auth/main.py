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
from schemas import UserCreate, UserLogin, Token, UserResponse, RoleCreate, RoleResponse

app = FastAPI(
    title="Auth Service",
    description="Authentication and Authorization Service for Hotel Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
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


@app.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
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
        hashed_password=hash_password(user_data.password)
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
            "sub": new_user.id,
            "username": new_user.username,
            "roles": roles
        }
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@app.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and get access token
    
    - **username**: Username or email
    - **password**: User password
    """
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.username)
    ).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create access token with roles
    roles = [r.name for r in user.roles]
    access_token = create_access_token(
        data={
            "sub": user.id,
            "username": user.username,
            "roles": roles
        }
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@app.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get current authenticated user information
    """
    user = db.query(User).filter(User.id == current_user["sub"]).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)


@app.get("/users", response_model=List[UserResponse])
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all users (Admin only)
    """
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access this endpoint"
        )
    
    users = db.query(User).all()
    return [UserResponse.model_validate(user) for user in users]


@app.get("/roles", response_model=List[RoleResponse])
async def get_all_roles(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all roles (Admin only)
    """
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access this endpoint"
        )
    
    roles = db.query(Role).all()
    return [RoleResponse.model_validate(role) for role in roles]


@app.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new role (Admin only)
    """
    user_roles = current_user.get("roles", [])
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create roles"
        )
    
    # Check if role exists
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already exists"
        )
    
    new_role = Role(**role_data.dict())
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    
    return RoleResponse.model_validate(new_role)


@app.put("/users/{user_id}/roles", response_model=UserResponse)
async def update_user_roles(
    user_id: int,
    role_names: List[str],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user roles (Admin only)
    """
    user_roles_list = current_user.get("roles", [])
    if "admin" not in user_roles_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update user roles"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get roles
    roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    if len(roles) != len(role_names):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more roles not found"
        )
    
    # Update user roles
    user.roles = roles
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@app.post("/verify-token")
async def verify_token_endpoint(token: str):
    """
    Verify JWT token validity
    """
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    return {"valid": True, "payload": payload}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth-service"}


# Helper functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.verify(plain_password, hashed_password)
