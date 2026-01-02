"""
Report Service - Database Models
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
import sys
import os

from database import Base


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(50), nullable=False)  # revenue, booking, occupancy, etc.
    report_data = Column(Text)  # JSON string
    generated_by = Column(Integer)  # User ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())

