"""
Notification Service - Email and Notification Service
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime
import sys
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from database import get_db, Base, engine
from shared.common.dependencies import get_current_user, get_token
from shared.utils.http_client import call_service
from shared.utils.jwt_handler import verify_token
from fastapi import Request, Depends
from typing import Optional
from models import Notification
from schemas import EmailNotification, BookingNotification, NotificationResponse

app = FastAPI(
    title="Notification Service",
    description="Email and Notification Service for Hotel Management System",
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

# Email configuration (from environment variables)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@hotel.com")

# Create tables
Base.metadata.create_all(bind=engine)


def send_email_sync(to_email: str, subject: str, body: str, is_html: bool = False) -> bool:
    """
    Send email synchronously (for development/testing)
    In production, use async email service or queue
    """
    try:
        if not SMTP_USER or not SMTP_PASSWORD:
            # In development, just log the email
            print(f"[EMAIL] To: {to_email}, Subject: {subject}")
            print(f"[EMAIL] Body: {body}")
            return True
        
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        
        if is_html:
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


async def get_optional_user(request: Request) -> Optional[dict]:
    """Optional user dependency - allows internal service calls without auth"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = verify_token(token)
            if payload:
                return payload
    except:
        pass
    return None


@app.post("/notify/email", response_model=NotificationResponse)
async def send_email(
    email_data: EmailNotification,
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Send email notification (Gửi email)
    
    - **to_email**: Recipient email address
    - **subject**: Email subject
    - **body**: Email body (plain text or HTML)
    - **is_html**: Whether body is HTML format
    
    Note: This endpoint can be called internally without auth for inter-service communication.
    If called from API Gateway, it requires JWT.
    """
    
    # Send email
    success = send_email_sync(
        to_email=email_data.to_email,
        subject=email_data.subject,
        body=email_data.body,
        is_html=email_data.is_html
    )
    
    # Save notification record
    notification = Notification(
        recipient=email_data.to_email,
        notification_type="email",
        subject=email_data.subject,
        message=email_data.body,
        status="sent" if success else "failed",
        metadata={"is_html": email_data.is_html}
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return NotificationResponse.model_validate(notification)


@app.post("/notify/booking", response_model=NotificationResponse)
async def send_booking_notification(
    booking_data: BookingNotification,
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Send booking notification (Thông báo booking)
    
    - **booking_id**: Booking ID
    - **notification_type**: Type of notification (confirmation, reminder, cancellation, etc.)
    - **customer_email**: Customer email (optional, will fetch from booking if not provided)
    """
    # Get token for inter-service calls (optional for internal calls)
    auth_header = {}
    try:
        if request:
            token = await get_token(request)
            auth_header = {"Authorization": f"Bearer {token}"}
    except:
        # If no token, try to get from current_user if available
        if current_user and current_user.get("token"):
            auth_header = {"Authorization": f"Bearer {current_user.get('token')}"}
    
    # Get booking details
    try:
        booking = await call_service(
            BOOKING_SERVICE_URL,
            f"bookings/{booking_data.booking_id}",
            headers=auth_header
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking not found: {str(e)}"
        )
    
    # Get customer email
    customer_email = booking_data.customer_email
    if not customer_email:
        try:
            customer = await call_service(
                CUSTOMER_SERVICE_URL,
                f"customers/{booking['customer_id']}",
                headers=auth_header
            )
            customer_email = customer.get("email")
        except:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer email not found"
            )
    
    # Generate email content based on notification type
    notification_type = booking_data.notification_type or "confirmation"
    
    if notification_type == "confirmation":
        subject = f"Booking Confirmation #{booking['id']}"
        body = f"""
        Dear Customer,
        
        Your booking has been confirmed!
        
        Booking ID: {booking['id']}
        Check-in: {booking['check_in']}
        Check-out: {booking['check_out']}
        Guests: {booking['guests']}
        Total Amount: {booking.get('total_amount', 0):,.0f} VND
        
        Thank you for choosing our hotel!
        """
    elif notification_type == "reminder":
        subject = f"Booking Reminder #{booking['id']}"
        body = f"""
        Dear Customer,
        
        This is a reminder about your upcoming booking.
        
        Booking ID: {booking['id']}
        Check-in: {booking['check_in']}
        Check-out: {booking['check_out']}
        
        We look forward to welcoming you!
        """
    elif notification_type == "cancellation":
        subject = f"Booking Cancelled #{booking['id']}"
        body = f"""
        Dear Customer,
        
        Your booking has been cancelled.
        
        Booking ID: {booking['id']}
        Check-in: {booking['check_in']}
        Check-out: {booking['check_out']}
        
        If you have any questions, please contact us.
        """
    else:
        subject = f"Booking Update #{booking['id']}"
        body = f"""
        Dear Customer,
        
        Your booking has been updated.
        
        Booking ID: {booking['id']}
        Status: {booking.get('status', 'unknown')}
        
        Please check your booking details.
        """
    
    # Send email
    success = send_email_sync(
        to_email=customer_email,
        subject=subject,
        body=body,
        is_html=False
    )
    
    # Save notification record
    notification = Notification(
        recipient=customer_email,
        notification_type=f"booking_{notification_type}",
        subject=subject,
        message=body,
        status="sent" if success else "failed",
        metadata={
            "booking_id": booking_data.booking_id,
            "notification_type": notification_type
        }
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send booking notification"
        )
    
    return NotificationResponse.model_validate(notification)


@app.get("/notifications", response_model=list[NotificationResponse])
async def get_notifications(
    recipient: Optional[str] = None,
    notification_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notification history
    
    Note: Only admin can view all notifications. Regular users can only view their own.
    """
    query = db.query(Notification)
    
    # Check if user is admin
    user_roles = current_user.get("roles", [])
    is_admin = "admin" in user_roles or "manager" in user_roles
    
    # If not admin, filter by user email
    if not is_admin:
        user_email = current_user.get("email") or current_user.get("username")
        if user_email:
            query = query.filter(Notification.recipient == user_email)
    
    if recipient:
        query = query.filter(Notification.recipient == recipient)
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(100).all()
    return [NotificationResponse.model_validate(n) for n in notifications]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "notification-service"}

