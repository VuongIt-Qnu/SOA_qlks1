"""
Booking Service - Pydantic Schemas
"""
from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class BookingBase(BaseModel):
    customer_id: int
    room_id: int
    # ✅ FIX: DB là DATE => schema phải là date (không phải str)
    check_in: date
    check_out: date
    guests: int = 1
    special_requests: Optional[str] = None


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    customer_id: Optional[int] = None
    room_id: Optional[int] = None
    # ✅ update cũng để date để đồng bộ
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: Optional[int] = None
    status: Optional[str] = None
    total_amount: Optional[float] = None
    special_requests: Optional[str] = None


class BookingDetailBase(BaseModel):
    service_name: Optional[str] = None
    service_type: Optional[str] = None
    quantity: int = 1
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    notes: Optional[str] = None


class BookingDetailCreate(BookingDetailBase):
    booking_id: int


class BookingDetailResponse(BookingDetailBase):
    id: int
    booking_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookingResponse(BookingBase):
    id: int
    status: str
    total_amount: Optional[float] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    details: List[BookingDetailResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RoomAvailabilityCheck(BaseModel):
    room_id: int
    check_in: date
    check_out: date
    available: bool
    reason: Optional[str] = None
