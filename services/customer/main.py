"""
Customer Service - Customer Management Service
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from database import get_db, Base, engine
from shared.common.dependencies import get_current_user
from shared.utils.http_client import call_service
from models import Customer, CustomerProfile
from fastapi import Request
from shared.common.dependencies import get_token
from schemas import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    CustomerProfileCreate, CustomerProfileResponse,
    CustomerWithHistory
)

app = FastAPI(
    title="Customer Service",
    description="Customer Management Service for Hotel Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://booking-service:8000")

# Create tables
Base.metadata.create_all(bind=engine)


@app.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new customer
    
    - **name**: Customer full name
    - **email**: Customer email
    - **phone**: Customer phone number
    - **address**: Customer address
    """
    # Check if customer with email exists
    existing = db.query(Customer).filter(Customer.email == customer_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this email already exists"
        )
    
    new_customer = Customer(**customer_data.dict())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return CustomerResponse.model_validate(new_customer)


@app.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of customers with optional search
    
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records to return
    - **search**: Search by name, email, or phone
    """
    query = db.query(Customer)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(search_term)) |
            (Customer.email.ilike(search_term)) |
            (Customer.phone.ilike(search_term))
        )
    
    customers = query.offset(skip).limit(limit).all()
    return [CustomerResponse.model_validate(customer) for customer in customers]


@app.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get customer by ID"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return CustomerResponse.model_validate(customer)


@app.get("/customers/{customer_id}/with-history", response_model=CustomerWithHistory)
async def get_customer_with_history(
    customer_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get customer with booking history
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Get token for inter-service calls
    from shared.common.dependencies import get_token
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    
    # Get booking history from Booking Service
    try:
        bookings = await call_service(
            BOOKING_SERVICE_URL,
            f"bookings?customer_id={customer_id}",
            headers=auth_header
        )
        
        # Format booking history
        from schemas import BookingHistoryItem
        history = []
        for booking in bookings:
            # Get room info from Room Service
            try:
                room = await call_service(
                    os.getenv("ROOM_SERVICE_URL", "http://room-service:8000"),
                    f"rooms/{booking['room_id']}",
                    headers=auth_header
                )
                room_number = room.get('room_number', f"Room {booking['room_id']}")
            except:
                room_number = f"Room {booking['room_id']}"
            
            history.append(BookingHistoryItem(
                booking_id=booking['id'],
                room_number=room_number,
                check_in=booking['check_in'],
                check_out=booking['check_out'],
                status=booking['status'],
                total_amount=booking.get('total_amount')
            ))
    except Exception as e:
        history = []
    
    customer_data = CustomerResponse.model_validate(customer)
    return CustomerWithHistory(
        **customer_data.dict(),
        booking_history=history
    )


@app.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update customer information"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    update_data = customer_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@app.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    db.delete(customer)
    db.commit()
    return None


# Customer Profile Endpoints
@app.post("/customers/{customer_id}/profile", response_model=CustomerProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_profile(
    customer_id: int,
    profile_data: CustomerProfileCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update customer profile"""
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Check if profile exists
    existing_profile = db.query(CustomerProfile).filter(CustomerProfile.customer_id == customer_id).first()
    
    if existing_profile:
        # Update existing profile
        update_data = profile_data.dict(exclude_unset=True, exclude={'customer_id'})
        for field, value in update_data.items():
            setattr(existing_profile, field, value)
        db.commit()
        db.refresh(existing_profile)
        return CustomerProfileResponse.model_validate(existing_profile)
    else:
        # Create new profile
        new_profile = CustomerProfile(customer_id=customer_id, **profile_data.dict(exclude={'customer_id'}))
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        return CustomerProfileResponse.model_validate(new_profile)


@app.get("/customers/{customer_id}/profile", response_model=CustomerProfileResponse)
async def get_customer_profile(
    customer_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get customer profile"""
    profile = db.query(CustomerProfile).filter(CustomerProfile.customer_id == customer_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer profile not found"
        )
    return CustomerProfileResponse.model_validate(profile)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "customer-service"}
