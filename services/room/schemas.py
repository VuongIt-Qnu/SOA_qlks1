"""
Room Service - Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class RoomTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    price_per_night: float
    max_occupancy: int
    amenities: Optional[str] = None


class RoomTypeCreate(RoomTypeBase):
    pass


class RoomTypeResponse(RoomTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RoomBase(BaseModel):
    room_number: str
    room_type_id: int
    status: Optional[str] = "available"
    floor: Optional[int] = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type_id: Optional[int] = None
    status: Optional[str] = None
    floor: Optional[int] = None


class RoomResponse(RoomBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    room_type: Optional[RoomTypeResponse] = None
    
    class Config:
        from_attributes = True


class RoomAvailability(BaseModel):
    room_id: int
    available: bool
    reason: str
    check_in: date
    check_out: date
