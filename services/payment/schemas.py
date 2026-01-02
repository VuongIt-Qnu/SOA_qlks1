"""
Payment Service - Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentBase(BaseModel):
    booking_id: int
    amount: float
    payment_method: str  # cash, card, bank_transfer
    payment_status: Optional[str] = "pending"
    transaction_id: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    booking_id: int
    customer_id: int
    total_amount: float
    tax_amount: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    final_amount: float
    due_date: Optional[datetime] = None


class InvoiceCreate(InvoiceBase):
    payment_id: int


class InvoiceResponse(InvoiceBase):
    id: int
    payment_id: int
    invoice_number: str
    issued_at: datetime
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class PaymentWithInvoice(PaymentResponse):
    invoice: Optional[InvoiceResponse] = None
