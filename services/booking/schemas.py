"""
Booking Service - Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class BookingBase(BaseModel):
    customer_id: int
    room_id: int
    check_in: str  # ISO format date string
    check_out: str  # ISO format date string
    guests: int = 1
    special_requests: Optional[str] = None


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    customer_id: Optional[int] = None
    room_id: Optional[int] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
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
    
    class Config:
        from_attributes = True


class BookingResponse(BookingBase):
    id: int
    status: str
    total_amount: Optional[float] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    details: List[BookingDetailResponse] = []
    
    class Config:
        from_attributes = True


class RoomAvailabilityCheck(BaseModel):
    room_id: int
    check_in: date
    check_out: date
    available: bool
    reason: Optional[str] = None
