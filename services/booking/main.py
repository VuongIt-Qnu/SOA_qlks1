"""
Booking Service - Booking Management Service
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from database import get_db, Base, engine
from shared.common.dependencies import get_current_user, get_token
from shared.utils.http_client import call_service
from fastapi import Request
from models import Booking, BookingDetail
from schemas import (
    BookingCreate, BookingUpdate, BookingResponse,
    BookingDetailCreate, BookingDetailResponse,
    RoomAvailabilityCheck
)

app = FastAPI(
    title="Booking Service",
    description="Booking Management Service for Hotel Management System",
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
CUSTOMER_SERVICE_URL = os.getenv("CUSTOMER_SERVICE_URL", "http://customer-service:8000")
ROOM_SERVICE_URL = os.getenv("ROOM_SERVICE_URL", "http://room-service:8000")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")

# Create tables
Base.metadata.create_all(bind=engine)


@app.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new booking
    
    - **customer_id**: Customer ID
    - **room_id**: Room ID
    - **check_in**: Check-in date (ISO format: YYYY-MM-DD)
    - **check_out**: Check-out date (ISO format: YYYY-MM-DD)
    - **guests**: Number of guests
    - **special_requests**: Special requests
    """
    # Get token for inter-service calls
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    
    # Verify customer exists
    try:
        await call_service(
            CUSTOMER_SERVICE_URL,
            f"customers/{booking_data.customer_id}",
            headers=auth_header
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Check room availability via Room Service
    try:
        check_in_date = datetime.fromisoformat(booking_data.check_in).date()
        check_out_date = datetime.fromisoformat(booking_data.check_out).date()
        
        # Check room availability
        availability = await call_service(
            ROOM_SERVICE_URL,
            f"rooms/{booking_data.room_id}/availability?check_in={check_in_date}&check_out={check_out_date}",
            headers=auth_header
        )
        
        # If availability check doesn't include dates, check room status directly
        if not availability.get("available", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=availability.get("reason", "Room is not available for the selected dates")
            )
        
        # Also verify room status
        room = await call_service(
            ROOM_SERVICE_URL,
            f"rooms/{booking_data.room_id}",
            headers=auth_header
        )
        
        if room.get("status") not in ["available", "booked"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room status is {room.get('status')}, cannot create booking"
            )
        
        # Get room info to calculate price
        room_type = await call_service(
            ROOM_SERVICE_URL,
            f"room-types/{room['room_type_id']}",
            headers=auth_header
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room not found or service unavailable: {str(e)}"
        )
    
    # Check date validity
    if check_out_date <= check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be after check-in date"
        )
    
    # Calculate total amount
    nights = (check_out_date - check_in_date).days
    price_per_night = room_type.get("price_per_night", 0)
    total_amount = nights * price_per_night
    
    # Create booking
    new_booking = Booking(
        customer_id=booking_data.customer_id,
        room_id=booking_data.room_id,
        check_in=check_in_date,
        check_out=check_out_date,
        guests=booking_data.guests,
        status="confirmed",
        total_amount=total_amount,
        special_requests=booking_data.special_requests
    )
    
    db.add(new_booking)
    db.flush()
    
    # Update room status to "booked"
    try:
        await call_service(
            ROOM_SERVICE_URL,
            f"rooms/{booking_data.room_id}/status",
            method="PUT",
            data={"new_status": "booked"},
            headers=auth_header
        )
    except:
        pass  # Continue even if room status update fails
    
    db.commit()
    db.refresh(new_booking)
    
    # Send booking notification (async, don't fail if notification fails)
    try:
        await call_service(
            NOTIFICATION_SERVICE_URL,
            "notify/booking",
            method="POST",
            data={
                "booking_id": new_booking.id,
                "notification_type": "confirmation"
            },
            headers=auth_header
        )
    except Exception as e:
        # Log error but don't fail the booking creation
        print(f"Failed to send booking notification: {e}")
    
    return BookingResponse.model_validate(new_booking)


@app.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(
    customer_id: Optional[int] = None,
    room_id: Optional[int] = None,
    status: Optional[str] = None,
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of bookings with optional filters
    
    - **customer_id**: Filter by customer
    - **room_id**: Filter by room
    - **status**: Filter by status
    - **check_in**: Filter by check-in date
    - **check_out**: Filter by check-out date
    
    Note: Regular users can only see their own bookings. Admins can see all bookings.
    """
    query = db.query(Booking)
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
    
    # If not admin, filter by customer_id from token
    if not is_admin:
        user_id = int(current_user.get("sub"))  # Convert string to int
        # Try to get customer_id from user_id (may need to call customer service)
        # For now, if customer_id is not provided, filter by user_id
        if not customer_id:
            # Assume customer_id matches user_id (may need adjustment based on your schema)
            customer_id = user_id
    
    if customer_id:
        query = query.filter(Booking.customer_id == customer_id)
    if room_id:
        query = query.filter(Booking.room_id == room_id)
    if status:
        query = query.filter(Booking.status == status)
    if check_in:
        query = query.filter(Booking.check_in >= check_in)
    if check_out:
        query = query.filter(Booking.check_out <= check_out)
    
    bookings = query.order_by(Booking.check_in.desc()).all()
    return [BookingResponse.model_validate(booking) for booking in bookings]


@app.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get booking by ID
    
    Note: Regular users can only see their own bookings. Admins can see all bookings.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
    
    # If not admin, check if booking belongs to user
    if not is_admin:
        user_id = int(current_user.get("sub"))  # Convert string to int
        # Assume customer_id matches user_id (may need adjustment based on your schema)
        if booking.customer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own bookings"
            )
    
    return BookingResponse.model_validate(booking)


@app.put("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update booking information
    
    Note: Regular users can only update their own bookings. Admins can update any booking.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
    
    # If not admin, check if booking belongs to user
    if not is_admin:
        user_id = int(current_user.get("sub"))  # Convert string to int
        # Assume customer_id matches user_id (may need adjustment based on your schema)
        if booking.customer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own bookings"
            )
    
    # Check if booking can be updated (not cancelled or checked out)
    if booking.status in ["cancelled", "checked_out"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update booking with status: {booking.status}"
        )
    
    update_data = booking_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["check_in", "check_out"]:
            setattr(booking, field, datetime.fromisoformat(value).date())
        else:
            setattr(booking, field, value)
    
    db.commit()
    db.refresh(booking)
    return BookingResponse.model_validate(booking)


@app.put("/bookings/{booking_id}/check-in", response_model=BookingResponse)
async def check_in(
    booking_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check-in a booking
    
    Changes booking status to "checked_in" and updates room status to "occupied"
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status not in ["confirmed", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check-in booking with status: {booking.status}"
        )
    
    # Update booking
    booking.status = "checked_in"
    booking.checked_in_at = datetime.now()
    db.commit()
    
    # Update room status to "occupied"
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    try:
        await call_service(
            ROOM_SERVICE_URL,
            f"rooms/{booking.room_id}/status",
            method="PUT",
            data={"new_status": "occupied"},
            headers=auth_header
        )
    except Exception as e:
        # Log error but continue
        print(f"Failed to update room status: {e}")
    
    db.refresh(booking)
    return BookingResponse.model_validate(booking)


@app.put("/bookings/{booking_id}/check-out", response_model=BookingResponse)
async def check_out(
    booking_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check-out a booking
    
    Changes booking status to "checked_out" and updates room status to "available"
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status != "checked_in":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking must be checked in before check-out"
        )
    
    # Update booking
    booking.status = "checked_out"
    booking.checked_out_at = datetime.now()
    db.commit()
    
    # Update room status to "available"
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    try:
        await call_service(
            ROOM_SERVICE_URL,
            f"rooms/{booking.room_id}/status",
            method="PUT",
            data={"new_status": "available"},
            headers=auth_header
        )
    except Exception as e:
        # Log error but continue
        print(f"Failed to update room status: {e}")
    
    db.refresh(booking)
    return BookingResponse.model_validate(booking)


@app.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete/Cancel a booking
    
    This endpoint cancels the booking (sets status to "cancelled") and updates room status to "available".
    Note: Regular users can only cancel their own bookings. Admins can cancel any booking.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
    
    # If not admin, check if booking belongs to user
    if not is_admin:
        user_id = int(current_user.get("sub"))  # Convert string to int
        # Assume customer_id matches user_id (may need adjustment based on your schema)
        if booking.customer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own bookings"
            )
    
    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled"
        )
    
    if booking.status == "checked_out":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a checked-out booking"
        )
    
    # Update booking status to cancelled
    booking.status = "cancelled"
    db.commit()
    
    # Update room status to "available" if not already checked in
    if booking.status != "checked_in":
        token = await get_token(request)
        auth_header = {"Authorization": f"Bearer {token}"}
        try:
            await call_service(
                ROOM_SERVICE_URL,
                f"rooms/{booking.room_id}/status",
                method="PUT",
                data={"new_status": "available"},
                headers=auth_header
            )
        except Exception as e:
            # Log error but continue
            print(f"Failed to update room status: {e}")
    
    # Send cancellation notification
    try:
        await call_service(
            NOTIFICATION_SERVICE_URL,
            "notify/booking",
            method="POST",
            data={
                "booking_id": booking.id,
                "notification_type": "cancellation"
            },
            headers=auth_header
        )
    except Exception as e:
        # Log error but don't fail the cancellation
        print(f"Failed to send cancellation notification: {e}")
    
    return None


@app.put("/bookings/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a booking (Alternative endpoint using PUT)
    
    Changes booking status to "cancelled" and updates room status to "available"
    Note: Regular users can only cancel their own bookings. Admins can cancel any booking.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
    
    # If not admin, check if booking belongs to user
    if not is_admin:
        user_id = int(current_user.get("sub"))  # Convert string to int
        # Assume customer_id matches user_id (may need adjustment based on your schema)
        if booking.customer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own bookings"
            )
    
    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled"
        )
    
    if booking.status == "checked_out":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a checked-out booking"
        )
    
    # Update booking
    booking.status = "cancelled"
    db.commit()
    
    # Update room status to "available" if not already checked in
    if booking.status != "checked_in":
        token = await get_token(request)
        auth_header = {"Authorization": f"Bearer {token}"}
        try:
            await call_service(
                ROOM_SERVICE_URL,
                f"rooms/{booking.room_id}/status",
                method="PUT",
                data={"new_status": "available"},
                headers=auth_header
            )
        except Exception as e:
            # Log error but continue
            print(f"Failed to update room status: {e}")
    
    db.refresh(booking)
    return BookingResponse.model_validate(booking)


@app.get("/bookings/available-rooms", response_model=List[dict])
async def get_available_rooms(
    check_in: date,
    check_out: date,
    room_type_id: Optional[int] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get available rooms for a date range
    
    This endpoint checks Room Service for available rooms and filters out
    rooms that have conflicting bookings.
    """
    token = await get_token(request) if request else current_user.get("token", "")
    auth_header = {"Authorization": f"Bearer {token}"} if token else {}
    
    try:
        # Get available rooms from Room Service
        params = f"check_in={check_in}&check_out={check_out}"
        if room_type_id:
            params += f"&room_type_id={room_type_id}"
        
        available_rooms = await call_service(
            ROOM_SERVICE_URL,
            f"rooms/available?{params}",
            headers=auth_header
        )
        
        # Filter out rooms with conflicting bookings
        room_ids = [room["id"] for room in available_rooms]
        conflicting_bookings = db.query(Booking).filter(
            Booking.room_id.in_(room_ids),
            Booking.status.notin_(["cancelled", "checked_out"]),
            Booking.check_in < check_out,
            Booking.check_out > check_in
        ).all()
        
        conflicting_room_ids = {b.room_id for b in conflicting_bookings}
        final_available = [
            room for room in available_rooms
            if room["id"] not in conflicting_room_ids
        ]
        
        return final_available
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking room availability: {str(e)}"
        )


# Booking Details Endpoints
@app.post("/bookings/{booking_id}/details", response_model=BookingDetailResponse, status_code=status.HTTP_201_CREATED)
async def add_booking_detail(
    booking_id: int,
    detail_data: BookingDetailCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a detail/service to a booking"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Calculate total price
    total_price = (detail_data.unit_price or 0) * detail_data.quantity
    
    new_detail = BookingDetail(
        booking_id=booking_id,
        service_name=detail_data.service_name,
        service_type=detail_data.service_type,
        quantity=detail_data.quantity,
        unit_price=detail_data.unit_price,
        total_price=total_price,
        notes=detail_data.notes
    )
    
    db.add(new_detail)
    
    # Update booking total amount
    booking.total_amount = (booking.total_amount or 0) + total_price
    db.commit()
    db.refresh(new_detail)
    
    return BookingDetailResponse.model_validate(new_detail)


@app.get("/bookings/{booking_id}/details", response_model=List[BookingDetailResponse])
async def get_booking_details(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all details for a booking"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    return [BookingDetailResponse.model_validate(detail) for detail in booking.details]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "booking-service"}
