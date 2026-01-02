"""
Room Service - Room Management Service
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from database import get_db, Base, engine
from shared.common.dependencies import get_current_user
from shared.utils.http_client import call_service
from models import Room, RoomType
from schemas import RoomCreate, RoomUpdate, RoomResponse, RoomTypeCreate, RoomTypeResponse, RoomAvailability

app = FastAPI(
    title="Room Service",
    description="Room Management Service for Hotel Management System",
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


# Room Type Endpoints
@app.post("/room-types", response_model=RoomTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_room_type(
    room_type_data: RoomTypeCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new room type"""
    # Check if room type with same name exists
    existing = db.query(RoomType).filter(RoomType.name == room_type_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room type with this name already exists"
        )
    
    new_room_type = RoomType(**room_type_data.dict())
    db.add(new_room_type)
    db.commit()
    db.refresh(new_room_type)
    return RoomTypeResponse.model_validate(new_room_type)


@app.get("/room-types", response_model=List[RoomTypeResponse])
async def get_room_types(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all room types"""
    return [RoomTypeResponse.model_validate(rt) for rt in db.query(RoomType).all()]


@app.get("/room-types/{room_type_id}", response_model=RoomTypeResponse)
async def get_room_type(
    room_type_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get room type by ID"""
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found"
        )
    return RoomTypeResponse.model_validate(room_type)


@app.put("/room-types/{room_type_id}", response_model=RoomTypeResponse)
async def update_room_type(
    room_type_id: int,
    room_type_data: RoomTypeCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update room type"""
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found"
        )
    
    update_data = room_type_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room_type, field, value)
    
    db.commit()
    db.refresh(room_type)
    return RoomTypeResponse.model_validate(room_type)


# Room Endpoints
@app.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new room"""
    # Verify room type exists
    room_type = db.query(RoomType).filter(RoomType.id == room_data.room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found"
        )
    
    # Check if room number exists
    existing = db.query(Room).filter(Room.room_number == room_data.room_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room number already exists"
        )
    
    new_room = Room(**room_data.dict())
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return RoomResponse.model_validate(new_room)


@app.get("/rooms", response_model=List[RoomResponse])
async def get_rooms(
    room_type_id: Optional[int] = None,
    status: Optional[str] = None,
    floor: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of rooms with optional filters
    
    - **room_type_id**: Filter by room type
    - **status**: Filter by status (available, booked, occupied, maintenance)
    - **floor**: Filter by floor
    """
    query = db.query(Room)
    
    if room_type_id:
        query = query.filter(Room.room_type_id == room_type_id)
    if status:
        query = query.filter(Room.status == status)
    if floor:
        query = query.filter(Room.floor == floor)
    
    rooms = query.all()
    return [RoomResponse.model_validate(room) for room in rooms]


@app.get("/rooms/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get room by ID"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    return RoomResponse.model_validate(room)


@app.put("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    room_data: RoomUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update room information"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    update_data = room_data.dict(exclude_unset=True)
    
    # If updating room_type_id, verify it exists
    if 'room_type_id' in update_data:
        room_type = db.query(RoomType).filter(RoomType.id == update_data['room_type_id']).first()
        if not room_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room type not found"
            )
    
    for field, value in update_data.items():
        setattr(room, field, value)
    
    db.commit()
    db.refresh(room)
    return RoomResponse.model_validate(room)


@app.put("/rooms/{room_id}/status", response_model=RoomResponse)
async def update_room_status(
    room_id: int,
    status_data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update room status
    
    Valid statuses: available, booked, occupied, maintenance
    Request body: {"new_status": "available"}
    """
    new_status = status_data.get("new_status")
    valid_statuses = ["available", "booked", "occupied", "maintenance"]
    if not new_status or new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    room.status = new_status
    db.commit()
    db.refresh(room)
    return RoomResponse.model_validate(room)


@app.get("/rooms/{room_id}/availability", response_model=RoomAvailability)
async def check_room_availability(
    room_id: int,
    check_in: date,
    check_out: date,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check room availability for given dates
    
    This endpoint checks if a room is available for the specified date range
    by querying the Booking Service for conflicting bookings.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # If dates not provided, just check room status
    if not check_in or not check_out:
        is_available = room.status == "available"
        return RoomAvailability(
            room_id=room_id,
            available=is_available,
            reason=f"Room status: {room.status}",
            check_in=check_in or date.today(),
            check_out=check_out or date.today()
        )
    
    # Check room status
    if room.status == "maintenance":
        return RoomAvailability(
            room_id=room_id,
            available=False,
            reason="Room is under maintenance",
            check_in=check_in,
            check_out=check_out
        )
    
    if room.status == "occupied":
        return RoomAvailability(
            room_id=room_id,
            available=False,
            reason="Room is currently occupied",
            check_in=check_in,
            check_out=check_out
        )
    
    # Check for conflicting bookings via Booking Service
    try:
        # Get token from current_user
        token = current_user.get("token", "")
        auth_header = {"Authorization": f"Bearer {token}"} if token else {}
        
        # Query bookings for this room
        bookings = await call_service(
            BOOKING_SERVICE_URL,
            f"bookings?room_id={room_id}",
            headers=auth_header
        )
        
        # Filter for active bookings that overlap with requested dates
        active_bookings = []
        for booking in bookings:
            if booking.get("status") in ["cancelled", "checked_out", "completed"]:
                continue
            
            booking_check_in = datetime.fromisoformat(booking.get("check_in", "")).date()
            booking_check_out = datetime.fromisoformat(booking.get("check_out", "")).date()
            
            # Check for overlap
            if not (check_out <= booking_check_in or check_in >= booking_check_out):
                active_bookings.append(booking)
        
        if active_bookings:
            return RoomAvailability(
                room_id=room_id,
                available=False,
                reason=f"Room has {len(active_bookings)} active booking(s) in this period",
                check_in=check_in,
                check_out=check_out
            )
        
        return RoomAvailability(
            room_id=room_id,
            available=True,
            reason="Room is available",
            check_in=check_in,
            check_out=check_out
        )
    except Exception as e:
        # If Booking Service is unavailable, assume available if room status is available
        if room.status == "available":
            return RoomAvailability(
                room_id=room_id,
                available=True,
                reason="Room status is available (booking service unavailable)",
                check_in=check_in,
                check_out=check_out
            )
        return RoomAvailability(
            room_id=room_id,
            available=False,
            reason=f"Unable to verify availability: {str(e)}",
            check_in=check_in,
            check_out=check_out
        )


@app.get("/rooms/available", response_model=List[RoomResponse])
async def get_available_rooms(
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    room_type_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of available rooms
    
    - **check_in**: Check-in date (optional)
    - **check_out**: Check-out date (optional)
    - **room_type_id**: Filter by room type (optional)
    """
    query = db.query(Room).filter(Room.status == "available")
    
    if room_type_id:
        query = query.filter(Room.room_type_id == room_type_id)
    
    rooms = query.all()
    
    # If dates provided, filter by availability
    if check_in and check_out:
        available_rooms = []
        for room in rooms:
            try:
                availability = await check_room_availability(room.id, check_in, check_out, current_user, db)
                if availability.available:
                    available_rooms.append(room)
            except:
                # If check fails, include room if status is available
                if room.status == "available":
                    available_rooms.append(room)
        rooms = available_rooms
    
    return [RoomResponse.model_validate(room) for room in rooms]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "room-service"}
