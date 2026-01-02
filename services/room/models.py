"""
Room Service - Database Models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
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
    price_per_night = Column(Float, nullable=False)
    max_occupancy = Column(Integer, nullable=False)
    amenities = Column(String(500))  # JSON string or comma-separated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    rooms = relationship("Room", back_populates="room_type")


class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(10), unique=True, nullable=False, index=True)
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=False)
    status = Column(String(20), default="available")  # available, booked, occupied, maintenance
    floor = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    room_type = relationship("RoomType", back_populates="rooms")
