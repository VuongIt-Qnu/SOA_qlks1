"""
Payment Service - Database Models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os

from database import Base


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(20), nullable=False)  # cash, card, bank_transfer
    payment_status = Column(String(20), default="pending")  # pending, paid, failed, refunded
    transaction_id = Column(String(100), unique=True, index=True)
    notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship with invoice (one-to-one)
    invoice = relationship("Invoice", back_populates="payment", uselist=False)


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), unique=True, nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    booking_id = Column(Integer, nullable=False, index=True)
    customer_id = Column(Integer, nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    final_amount = Column(Float, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True))
    status = Column(String(20), default="pending")  # pending, paid, overdue, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship with payment
    payment = relationship("Payment", back_populates="invoice")
