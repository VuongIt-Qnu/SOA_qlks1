"""
Notification Service - Database Models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from database import Base


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String, nullable=False, index=True)
    notification_type = Column(String, nullable=False)  # email, booking_confirmation, etc.
    subject = Column(String)
    message = Column(Text)
    status = Column(String, default="pending")  # pending, sent, failed
    metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)

