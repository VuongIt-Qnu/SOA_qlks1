"""
Booking Service - Database Models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os

from database import Base


class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=False, index=True)
    room_id = Column(Integer, nullable=False, index=True)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    guests = Column(Integer, nullable=False, default=1)
    status = Column(String(20), default="pending")  # pending, confirmed, checked_in, checked_out, cancelled, completed
    total_amount = Column(Float)
    special_requests = Column(String(500))
    checked_in_at = Column(DateTime(timezone=True))
    checked_out_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship with booking details (one-to-many)
    details = relationship("BookingDetail", back_populates="booking", cascade="all, delete-orphan")


class BookingDetail(Base):
    __tablename__ = "booking_details"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    service_name = Column(String(100))  # e.g., "Breakfast", "Laundry", "Room Service"
    service_type = Column(String(50))  # service, extra_bed, etc.
    quantity = Column(Integer, default=1)
    unit_price = Column(Float)
    total_price = Column(Float)
    notes = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship with booking
    booking = relationship("Booking", back_populates="details")
