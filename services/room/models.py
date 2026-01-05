"""
Room Service - Database Models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os

from database import Base


class RoomType(Base):
    __tablename__ = "room_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(255))
    price_per_night = Column(Numeric(10, 2), nullable=False)  # Match DECIMAL(10, 2) in database
    max_occupancy = Column(Integer, nullable=False)
    amenities = Column(String(500))  # JSON string or comma-separated
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    
    rooms = relationship("Room", back_populates="room_type")


class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(10), unique=True, nullable=False, index=True)
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=False)
    status = Column(String(20), default="available", nullable=False)  # available, booked, occupied, maintenance
    floor = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    
    room_type = relationship("RoomType", back_populates="rooms")
