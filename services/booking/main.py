"""
Booking Service - Booking Management Service
"""
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))

from database import get_db, Base, engine
from shared.common.dependencies import get_current_user, get_token
from shared.utils.http_client import call_service, ServiceHTTPError
from models import Booking, BookingDetail
from schemas import (
    BookingCreate,
    BookingUpdate,
    BookingResponse,
    BookingDetailCreate,
    BookingDetailResponse,
)

app = FastAPI(
    title="Booking Service",
    description="Booking Management Service for Hotel Management System",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs (docker-compose internal DNS)
CUSTOMER_SERVICE_URL = os.getenv("CUSTOMER_SERVICE_URL", "http://customer-service:8000")
ROOM_SERVICE_URL = os.getenv("ROOM_SERVICE_URL", "http://room-service:8000")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")

Base.metadata.create_all(bind=engine)


# -------------------------
# Helpers
# -------------------------
def _parse_iso_date(value) -> date:
    """Support both string 'YYYY-MM-DD' and date type."""
    if value is None:
        raise ValueError("Date value is None")
    if isinstance(value, date):
        return value
    return datetime.fromisoformat(str(value)).date()


def _has_conflict(db: Session, room_id: int, check_in: date, check_out: date) -> bool:
    """
    Overlap condition: existing.check_in < new.check_out AND existing.check_out > new.check_in
    Ignore cancelled/checked_out.
    """
    conflict = (
        db.query(Booking)
        .filter(
            Booking.room_id == room_id,
            Booking.status.notin_(["cancelled", "checked_out"]),
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
        .first()
    )
    return conflict is not None


async def _verify_customer_exists(customer_id: int, auth_header: dict):
    """Raise 404 if customer not found."""
    try:
        await call_service(CUSTOMER_SERVICE_URL, f"customers/{customer_id}", headers=auth_header)
    except ServiceHTTPError as e:
        if getattr(e, "status_code", None) == 404:
            raise HTTPException(status_code=404, detail="Customer not found")
        raise HTTPException(status_code=502, detail=f"Customer service error: {getattr(e, 'message', str(e))}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Customer service unavailable: {str(e)}")


async def _get_room(room_id: int, auth_header: dict) -> dict:
    """Call Room service to check room exists."""
    try:
        room = await call_service(ROOM_SERVICE_URL, f"rooms/{room_id}", headers=auth_header)
        if not isinstance(room, dict):
            raise HTTPException(status_code=502, detail="Room service returned invalid data")
        return room
    except ServiceHTTPError as e:
        if getattr(e, "status_code", None) == 404:
            raise HTTPException(status_code=404, detail="Room not found")
        raise HTTPException(status_code=502, detail=f"Room service error: {getattr(e, 'message', str(e))}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Room service unavailable: {str(e)}")


def _room_is_available_by_status(room: dict) -> bool:
    """Only accept 'available' as bookable."""
    status_val = (room.get("status") or "").lower()
    return status_val == "available"


def _calc_total_amount(room: dict, check_in: date, check_out: date) -> float:
    """Simple pricing: nights * price_per_night (fallback 0)."""
    nights = (check_out - check_in).days
    if nights < 1:
        return 0.0

    price_per_night = room.get("price_per_night")
    try:
        price_per_night = float(price_per_night) if price_per_night is not None else 0.0
    except Exception:
        price_per_night = 0.0

    return float(nights) * float(price_per_night)


async def _set_room_status(room_id: int, new_status: str, auth_header: dict):
    """
    Update room status in Room Service.
    This is best-effort: if it fails, booking still succeeds (SOA resilience).
    """
    try:
        await call_service(
            ROOM_SERVICE_URL,
            f"rooms/{room_id}/status",
            method="PUT",
            data={"new_status": new_status},
            headers=auth_header,
        )
    except Exception as e:
        print(f"[Booking] Failed to update room {room_id} status -> {new_status}: {e}")


def _build_auth_header_from_current_user(current_user: dict) -> dict:
    token = (current_user or {}).get("token") or ""
    return {"Authorization": f"Bearer {token}"} if token else {}


# -------------------------
# API
# -------------------------
@app.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new booking"""
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}

    check_in_date = _parse_iso_date(booking_data.check_in)
    check_out_date = _parse_iso_date(booking_data.check_out)

    if check_out_date <= check_in_date:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date")

    # Verify customer exists
    await _verify_customer_exists(booking_data.customer_id, auth_header)

    # Verify room exists
    room = await _get_room(booking_data.room_id, auth_header)

    # Check room status
    if not _room_is_available_by_status(room):
        raise HTTPException(
            status_code=400,
            detail=f"Room status is '{room.get('status')}', cannot create booking",
        )

    # Check conflict in booking DB
    if _has_conflict(db, booking_data.room_id, check_in_date, check_out_date):
        raise HTTPException(
            status_code=409,
            detail="Room is not available for the selected dates (conflicting booking exists)",
        )

    total_amount = _calc_total_amount(room, check_in_date, check_out_date)

    new_booking = Booking(
        customer_id=booking_data.customer_id,
        room_id=booking_data.room_id,
        check_in=check_in_date,
        check_out=check_out_date,
        guests=booking_data.guests,
        status="confirmed",
        total_amount=total_amount,
        special_requests=booking_data.special_requests,
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # ✅ SOA SYNC: set room -> booked
    await _set_room_status(new_booking.room_id, "booked", auth_header)

    # Notification best-effort
    try:
        await call_service(
            NOTIFICATION_SERVICE_URL,
            "notify/booking",
            method="POST",
            data={"booking_id": new_booking.id, "notification_type": "confirmation"},
            headers=auth_header,
        )
    except Exception as e:
        print(f"[Booking] Failed to send booking notification: {e}")

    return BookingResponse.model_validate(new_booking, from_attributes=True)


@app.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(
    customer_id: Optional[int] = None,
    room_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of bookings with optional filters"""
    query = db.query(Booking)

    user_roles = current_user.get("roles", [])
    is_admin = any(r in user_roles for r in ["admin", "manager", "receptionist"])

    if not is_admin:
        user_id = int(current_user.get("sub"))
        if not customer_id:
            customer_id = user_id

    if customer_id:
        query = query.filter(Booking.customer_id == customer_id)
    if room_id:
        query = query.filter(Booking.room_id == room_id)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    if check_in:
        query = query.filter(Booking.check_in >= check_in)
    if check_out:
        query = query.filter(Booking.check_out <= check_out)

    bookings = query.order_by(Booking.check_in.desc()).all()
    return [BookingResponse.model_validate(b, from_attributes=True) for b in bookings]


@app.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    user_roles = current_user.get("roles", [])
    is_admin = any(r in user_roles for r in ["admin", "manager", "receptionist"])

    if not is_admin:
        user_id = int(current_user.get("sub"))
        if booking.customer_id != user_id:
            raise HTTPException(status_code=403, detail="You can only view your own bookings")

    return BookingResponse.model_validate(booking, from_attributes=True)


@app.put("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    user_roles = current_user.get("roles", [])
    is_admin = any(r in user_roles for r in ["admin", "manager", "receptionist"])

    if not is_admin:
        user_id = int(current_user.get("sub"))
        if booking.customer_id != user_id:
            raise HTTPException(status_code=403, detail="You can only update your own bookings")

    if booking.status in ["cancelled", "checked_out"]:
        raise HTTPException(status_code=400, detail=f"Cannot update booking with status: {booking.status}")

    update_data = booking_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["check_in", "check_out"] and value is not None:
            setattr(booking, field, _parse_iso_date(value))
        else:
            setattr(booking, field, value)

    db.commit()
    db.refresh(booking)
    return BookingResponse.model_validate(booking, from_attributes=True)


@app.put("/bookings/{booking_id}/check-in", response_model=BookingResponse)
async def check_in_booking(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in ["confirmed", "pending"]:
        raise HTTPException(status_code=400, detail=f"Cannot check-in booking with status: {booking.status}")

    booking.status = "checked_in"
    booking.checked_in_at = datetime.now()
    db.commit()
    db.refresh(booking)

    # ✅ SOA SYNC: set room -> occupied
    auth_header = _build_auth_header_from_current_user(current_user)
    await _set_room_status(booking.room_id, "occupied", auth_header)

    return BookingResponse.model_validate(booking, from_attributes=True)


@app.put("/bookings/{booking_id}/check-out", response_model=BookingResponse)
async def check_out_booking(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "checked_in":
        raise HTTPException(status_code=400, detail="Booking must be checked in before check-out")

    booking.status = "checked_out"
    booking.checked_out_at = datetime.now()
    db.commit()
    db.refresh(booking)

    # ✅ SOA SYNC: set room -> available
    auth_header = _build_auth_header_from_current_user(current_user)
    await _set_room_status(booking.room_id, "available", auth_header)

    return BookingResponse.model_validate(booking, from_attributes=True)


@app.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel booking (set status = cancelled)"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    user_roles = current_user.get("roles", [])
    is_admin = any(r in user_roles for r in ["admin", "manager", "receptionist"])

    if not is_admin:
        user_id = int(current_user.get("sub"))
        if booking.customer_id != user_id:
            raise HTTPException(status_code=403, detail="You can only cancel your own bookings")

    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")
    if booking.status == "checked_out":
        raise HTTPException(status_code=400, detail="Cannot cancel a checked-out booking")

    booking.status = "cancelled"
    db.commit()

    # ✅ SOA SYNC: set room -> available
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    await _set_room_status(booking.room_id, "available", auth_header)

    # Notify (optional)
    try:
        await call_service(
            NOTIFICATION_SERVICE_URL,
            "notify/booking",
            method="POST",
            data={"booking_id": booking.id, "notification_type": "cancellation"},
            headers=auth_header,
        )
    except Exception as e:
        print(f"[Booking] Failed to send cancellation notification: {e}")

    return None


@app.get("/bookings/available-rooms", response_model=List[dict])
async def get_available_rooms(
    check_in: date,
    check_out: date,
    room_type_id: Optional[int] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get available rooms by:
    - fetching rooms from Room service: GET /rooms
    - status == available
    - room_type_id (optional)
    - no conflicts in booking DB
    """
    token = await get_token(request) if request else current_user.get("token", "")
    auth_header = {"Authorization": f"Bearer {token}"} if token else {}

    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    try:
        rooms = await call_service(ROOM_SERVICE_URL, "rooms", headers=auth_header)
        if not isinstance(rooms, list):
            raise HTTPException(status_code=502, detail="Room service returned invalid rooms list")
    except ServiceHTTPError as e:
        raise HTTPException(status_code=502, detail=f"Room service error: {getattr(e, 'message', str(e))}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Room service unavailable: {str(e)}")

    available_rooms = []
    for r in rooms:
        if not isinstance(r, dict):
            continue
        if (r.get("status") or "").lower() != "available":
            continue
        if room_type_id is not None and r.get("room_type_id") != room_type_id:
            continue
        available_rooms.append(r)

    final_rooms = []
    for r in available_rooms:
        rid = r.get("id")
        if not rid:
            continue
        if not _has_conflict(db, int(rid), check_in, check_out):
            final_rooms.append(r)

    return final_rooms


# Booking Details Endpoints
@app.post("/bookings/{booking_id}/details", response_model=BookingDetailResponse, status_code=status.HTTP_201_CREATED)
async def add_booking_detail(
    booking_id: int,
    detail_data: BookingDetailCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    total_price = (detail_data.unit_price or 0) * detail_data.quantity
    new_detail = BookingDetail(
        booking_id=booking_id,
        service_name=detail_data.service_name,
        service_type=detail_data.service_type,
        quantity=detail_data.quantity,
        unit_price=detail_data.unit_price,
        total_price=total_price,
        notes=detail_data.notes,
    )

    db.add(new_detail)
    booking.total_amount = float(booking.total_amount or 0) + float(total_price)
    db.commit()
    db.refresh(new_detail)
    return BookingDetailResponse.model_validate(new_detail, from_attributes=True)


@app.get("/bookings/{booking_id}/details", response_model=List[BookingDetailResponse])
async def get_booking_details(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return [BookingDetailResponse.model_validate(d, from_attributes=True) for d in booking.details]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "booking-service"}
