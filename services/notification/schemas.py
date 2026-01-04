"""
Notification Service - Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime


class EmailNotification(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    is_html: bool = False


class BookingNotification(BaseModel):
    booking_id: int
    notification_type: Optional[str] = "confirmation"  # confirmation, reminder, cancellation
    customer_email: Optional[EmailStr] = None


class NotificationResponse(BaseModel):
    id: int
    recipient: str
    notification_type: str
    subject: Optional[str]
    message: Optional[str]
    status: str
    metadata: Dict[str, Any] = {}
    created_at: datetime
    
    class Config:
        from_attributes = True

