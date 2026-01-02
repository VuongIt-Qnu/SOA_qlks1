"""
Customer Service - Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date


class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class CustomerProfileBase(BaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    id_card: Optional[str] = None
    notes: Optional[str] = None


class CustomerProfileCreate(CustomerProfileBase):
    customer_id: int


class CustomerProfileResponse(CustomerProfileBase):
    id: int
    customer_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    profile: Optional[CustomerProfileResponse] = None
    
    class Config:
        from_attributes = True


class BookingHistoryItem(BaseModel):
    booking_id: int
    room_number: str
    check_in: date
    check_out: date
    status: str
    total_amount: Optional[float] = None


class CustomerWithHistory(CustomerResponse):
    booking_history: List[BookingHistoryItem] = []
