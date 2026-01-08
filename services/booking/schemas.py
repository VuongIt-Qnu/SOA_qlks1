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


class BookingResponse(BaseModel):
    id: int
    customer_id: int
    room_id: int
    check_in: str  # ISO format date string
    check_out: str  # ISO format date string
    guests: int = 1
    status: str
    total_amount: Optional[float] = None
    special_requests: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    details: List[BookingDetailResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm(cls, booking):
        """
        Custom from_orm method to handle date conversion from SQLAlchemy model
        Converts datetime.date objects to ISO format strings
        """
        # Get booking data as dict
        if hasattr(booking, '__dict__'):
            data = {k: v for k, v in booking.__dict__.items() if not k.startswith('_')}
        else:
            # Fallback: use model_validate
            return cls.model_validate(booking, from_attributes=True)
        
        # Convert date objects to ISO format strings
        if 'check_in' in data and isinstance(data['check_in'], date):
            data['check_in'] = data['check_in'].isoformat()
        if 'check_out' in data and isinstance(data['check_out'], date):
            data['check_out'] = data['check_out'].isoformat()
        
        # Handle details relationship
        if 'details' in data and hasattr(booking, 'details'):
            data['details'] = [
                BookingDetailResponse.model_validate(d, from_attributes=True)
                for d in booking.details
            ]
        elif 'details' not in data:
            data['details'] = []
        
        return cls(**data)


class RoomAvailabilityCheck(BaseModel):
    room_id: int
    check_in: date
    check_out: date
    available: bool
    reason: Optional[str] = None
