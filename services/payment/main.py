"""
Payment Service - Payment Processing Service
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import sys
import os
import uuid

sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from database import get_db, Base, engine
from shared.common.dependencies import get_current_user, get_token
from shared.utils.http_client import call_service
from fastapi import Request
from models import Payment, Invoice
from schemas import (
    PaymentCreate, PaymentUpdate, PaymentResponse,
    InvoiceCreate, InvoiceResponse, PaymentWithInvoice
)

app = FastAPI(
    title="Payment Service",
    description="Payment Processing Service for Hotel Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://booking-service:8000")
CUSTOMER_SERVICE_URL = os.getenv("CUSTOMER_SERVICE_URL", "http://customer-service:8000")

# Create tables
Base.metadata.create_all(bind=engine)


def generate_invoice_number() -> str:
    """Generate unique invoice number"""
    return f"INV-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


@app.post("/payments", response_model=PaymentWithInvoice, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new payment for room booking (Thanh toán)
    
    - **booking_id**: Booking ID
    - **amount**: Payment amount
    - **payment_method**: Payment method (cash, card, bank_transfer)
    - **payment_status**: Payment status (pending, paid, failed)
    
    Note: Regular users can only create payments for their own bookings. Admins can create payments for any booking.
    """
    # Get token for inter-service calls
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    
    # Verify booking exists
    try:
        booking = await call_service(
            BOOKING_SERVICE_URL,
            f"bookings/{payment_data.booking_id}",
            headers=auth_header
        )
        
        if booking.get("status") == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot process payment for cancelled booking"
            )
        
        # Check if user is admin
        user_roles = current_user.get("roles", [])
        is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
        
        # If not admin, verify booking belongs to user
        if not is_admin:
            user_id = int(current_user.get("sub"))  # Convert string to int
            # Assume customer_id matches user_id (may need adjustment based on your schema)
            if booking.get("customer_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only create payments for your own bookings"
                )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Get customer info
    try:
        customer = await call_service(
            CUSTOMER_SERVICE_URL,
            f"customers/{booking['customer_id']}",
            headers=auth_header
        )
    except:
        customer = {"id": booking['customer_id']}
    
    # Generate transaction ID if not provided
    transaction_id = payment_data.transaction_id or f"TXN-{uuid.uuid4().hex[:12].upper()}"
    
    # Create payment
    new_payment = Payment(
        booking_id=payment_data.booking_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        payment_status=payment_data.payment_status,
        transaction_id=transaction_id,
        notes=payment_data.notes
    )
    
    db.add(new_payment)
    db.flush()
    
    # Create invoice
    tax_amount = payment_data.amount * 0.1  # 10% tax (example)
    discount_amount = 0.0
    final_amount = payment_data.amount + tax_amount - discount_amount
    
    new_invoice = Invoice(
        payment_id=new_payment.id,
        invoice_number=generate_invoice_number(),
        booking_id=booking['id'],
        customer_id=customer['id'],
        total_amount=payment_data.amount,
        tax_amount=tax_amount,
        discount_amount=discount_amount,
        final_amount=final_amount,
        due_date=datetime.now() + timedelta(days=7),
        status="pending"
    )
    
    db.add(new_invoice)
    db.commit()
    db.refresh(new_payment)
    db.refresh(new_invoice)
    
    payment_response = PaymentResponse.model_validate(new_payment)
    invoice_response = InvoiceResponse.model_validate(new_invoice)
    
    return PaymentWithInvoice(
        **payment_response.dict(),
        invoice=invoice_response
    )


@app.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    booking_id: Optional[int] = None,
    payment_status: Optional[str] = None,
    payment_method: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of payments with optional filters
    
    - **booking_id**: Filter by booking ID
    - **payment_status**: Filter by status (pending, paid, failed, refunded)
    - **payment_method**: Filter by payment method
    
    Note: Regular users can only see payments for their own bookings. Admins can see all payments.
    """
    query = db.query(Payment)
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
    
    # If not admin, filter by user's bookings
    if not is_admin:
        user_id = int(current_user.get("sub"))  # Convert string to int
        token = await get_token(request) if request else current_user.get("token", "")
        auth_header = {"Authorization": f"Bearer {token}"} if token else {}
        
        try:
            # Get bookings for this user
            bookings = await call_service(
                BOOKING_SERVICE_URL,
                f"bookings?customer_id={user_id}",
                headers=auth_header
            )
            booking_ids = [b['id'] for b in bookings]
            if not booking_ids:
                return []  # No bookings, no payments
            query = query.filter(Payment.booking_id.in_(booking_ids))
        except Exception as e:
            # If can't get bookings, return empty list for security
            return []
    
    if booking_id:
        query = query.filter(Payment.booking_id == booking_id)
    if payment_status:
        query = query.filter(Payment.payment_status == payment_status)
    if payment_method:
        query = query.filter(Payment.payment_method == payment_method)
    
    payments = query.order_by(Payment.created_at.desc()).all()
    return [PaymentResponse.model_validate(payment) for payment in payments]


@app.get("/payments/{payment_id}", response_model=PaymentWithInvoice)
async def get_payment(
    payment_id: int,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment by ID with invoice (Xem hóa đơn)
    
    Note: Regular users can only see payments for their own bookings. Admins can see all payments.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles or "receptionist" in user_roles
    
    # If not admin, verify payment belongs to user's booking
    if not is_admin:
        user_id = int(current_user.get("sub"))  # Convert string to int
        token = await get_token(request) if request else current_user.get("token", "")
        auth_header = {"Authorization": f"Bearer {token}"} if token else {}
        
        try:
            # Get booking to check customer_id
            booking = await call_service(
                BOOKING_SERVICE_URL,
                f"bookings/{payment.booking_id}",
                headers=auth_header
            )
            # Assume customer_id matches user_id (may need adjustment based on your schema)
            if booking.get("customer_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view payments for your own bookings"
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot verify payment ownership"
            )
    
    payment_response = PaymentResponse.model_validate(payment)
    invoice = db.query(Invoice).filter(Invoice.payment_id == payment_id).first()
    invoice_response = InvoiceResponse.model_validate(invoice) if invoice else None
    
    return PaymentWithInvoice(
        **payment_response.dict(),
        invoice=invoice_response
    )


@app.put("/payments/{payment_id}/complete", response_model=PaymentWithInvoice)
async def complete_payment(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark payment as completed (paid)
    
    Updates both payment status and invoice status to "paid"
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment is already completed"
        )
    
    payment.payment_status = "paid"
    
    # Update invoice status
    invoice = db.query(Invoice).filter(Invoice.payment_id == payment_id).first()
    if invoice:
        invoice.status = "paid"
    
    db.commit()
    db.refresh(payment)
    if invoice:
        db.refresh(invoice)
    
    payment_response = PaymentResponse.model_validate(payment)
    invoice_response = InvoiceResponse.model_validate(invoice) if invoice else None
    
    return PaymentWithInvoice(
        **payment_response.dict(),
        invoice=invoice_response
    )


@app.put("/payments/{payment_id}/refund", response_model=PaymentWithInvoice)
async def refund_payment(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process payment refund
    
    Only completed payments can be refunded
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.payment_status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only paid payments can be refunded"
        )
    
    payment.payment_status = "refunded"
    
    # Update invoice status
    invoice = db.query(Invoice).filter(Invoice.payment_id == payment_id).first()
    if invoice:
        invoice.status = "cancelled"
    
    db.commit()
    db.refresh(payment)
    if invoice:
        db.refresh(invoice)
    
    payment_response = PaymentResponse.model_validate(payment)
    invoice_response = InvoiceResponse.model_validate(invoice) if invoice else None
    
    return PaymentWithInvoice(
        **payment_response.dict(),
        invoice=invoice_response
    )


@app.get("/payments/transaction-history", response_model=List[PaymentResponse])
async def get_transaction_history(
    customer_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get transaction history
    
    - **customer_id**: Filter by customer (requires booking service call)
    - **start_date**: Start date filter
    - **end_date**: End date filter
    """
    query = db.query(Payment)
    
    if start_date:
        query = query.filter(Payment.created_at >= start_date)
    if end_date:
        query = query.filter(Payment.created_at <= end_date)
    
    payments = query.order_by(Payment.created_at.desc()).all()
    
    # If customer_id provided, filter by booking customer_id
    if customer_id:
        token = current_user.get("token", "")
        auth_header = {"Authorization": f"Bearer {token}"} if token else {}
        try:
            # Get bookings for customer
            bookings = await call_service(
                BOOKING_SERVICE_URL,
                f"bookings?customer_id={customer_id}",
                headers=auth_header
            )
            booking_ids = [b['id'] for b in bookings]
            payments = [p for p in payments if p.booking_id in booking_ids]
        except:
            pass
    
    return [PaymentResponse.model_validate(payment) for payment in payments]


# Invoice Endpoints
@app.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    customer_id: Optional[int] = None,
    booking_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of invoices"""
    query = db.query(Invoice)
    
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if booking_id:
        query = query.filter(Invoice.booking_id == booking_id)
    if status:
        query = query.filter(Invoice.status == status)
    
    invoices = query.order_by(Invoice.issued_at.desc()).all()
    return [InvoiceResponse.model_validate(invoice) for invoice in invoices]


@app.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get invoice by ID"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    return InvoiceResponse.model_validate(invoice)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "payment-service"}
