"""
Report Service - Reporting and Analytics Service
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from database import get_db, Base, engine
from shared.common.dependencies import get_current_user, get_token
from shared.utils.http_client import call_service
from fastapi import Request
from models import Report
from schemas import ReportCreate, ReportResponse

app = FastAPI(
    title="Report Service",
    description="Reporting and Analytics Service for Hotel Management System",
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
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8000")
ROOM_SERVICE_URL = os.getenv("ROOM_SERVICE_URL", "http://room-service:8000")
CUSTOMER_SERVICE_URL = os.getenv("CUSTOMER_SERVICE_URL", "http://customer-service:8000")

# Create tables
Base.metadata.create_all(bind=engine)


@app.get("/reports/revenue")
async def get_revenue_report(
    request: Request,
    period: str = "month",  # day, month, year
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get revenue report by period
    
    - **period**: day, month, or year
    - **start_date**: Start date (ISO format, optional)
    - **end_date**: End date (ISO format, optional)
    """
    # Get token for inter-service calls
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    
    # Default to last 30 days if not provided
    if not end_date:
        end_date = datetime.now().isoformat()
    if not start_date:
        if period == "day":
            start_date = (datetime.now() - timedelta(days=7)).isoformat()
        elif period == "month":
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        else:  # year
            start_date = (datetime.now() - timedelta(days=365)).isoformat()
    
    try:
        # Get payments in date range
        payments = await call_service(
            PAYMENT_SERVICE_URL,
            f"payments?payment_status=paid",
            headers=auth_header
        )
        
        # Filter by date range and group by period
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        filtered_payments = []
        for payment in payments:
            payment_date = datetime.fromisoformat(payment.get("created_at", "").replace('Z', '+00:00'))
            if start <= payment_date <= end:
                filtered_payments.append(payment)
        
        # Group by period
        revenue_by_period = {}
        total_revenue = 0
        payment_count = len(filtered_payments)
        
        for payment in filtered_payments:
            payment_date = datetime.fromisoformat(payment.get("created_at", "").replace('Z', '+00:00'))
            amount = payment.get("amount", 0)
            total_revenue += amount
            
            if period == "day":
                key = payment_date.strftime("%Y-%m-%d")
            elif period == "month":
                key = payment_date.strftime("%Y-%m")
            else:  # year
                key = payment_date.strftime("%Y")
            
            revenue_by_period[key] = revenue_by_period.get(key, 0) + amount
        
        return {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "total_revenue": total_revenue,
            "payment_count": payment_count,
            "average_payment": total_revenue / payment_count if payment_count > 0 else 0,
            "revenue_by_period": revenue_by_period,
            "chart_data": {
                "labels": sorted(revenue_by_period.keys()),
                "data": [revenue_by_period[k] for k in sorted(revenue_by_period.keys())]
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating revenue report: {str(e)}"
        )


@app.get("/reports/bookings")
async def get_booking_report(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get booking statistics report
    
    - **start_date**: Start date (ISO format)
    - **end_date**: End date (ISO format)
    """
    # Get token for inter-service calls
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    
    try:
        bookings = await call_service(
            BOOKING_SERVICE_URL,
            "bookings",
            headers=auth_header
        )
        
        # Filter by date if provided
        if start_date or end_date:
            filtered_bookings = []
            for booking in bookings:
                check_in = datetime.fromisoformat(booking.get("check_in", ""))
                if start_date and check_in < datetime.fromisoformat(start_date):
                    continue
                if end_date and check_in > datetime.fromisoformat(end_date):
                    continue
                filtered_bookings.append(booking)
            bookings = filtered_bookings
        
        # Calculate statistics
        total_bookings = len(bookings)
        confirmed = sum(1 for b in bookings if b.get("status") == "confirmed")
        checked_in = sum(1 for b in bookings if b.get("status") == "checked_in")
        checked_out = sum(1 for b in bookings if b.get("status") == "checked_out")
        cancelled = sum(1 for b in bookings if b.get("status") == "cancelled")
        pending = sum(1 for b in bookings if b.get("status") == "pending")
        
        return {
            "total_bookings": total_bookings,
            "confirmed": confirmed,
            "checked_in": checked_in,
            "checked_out": checked_out,
            "cancelled": cancelled,
            "pending": pending,
            "confirmation_rate": (confirmed / total_bookings * 100) if total_bookings > 0 else 0,
            "cancellation_rate": (cancelled / total_bookings * 100) if total_bookings > 0 else 0,
            "chart_data": {
                "labels": ["Confirmed", "Checked In", "Checked Out", "Cancelled", "Pending"],
                "data": [confirmed, checked_in, checked_out, cancelled, pending]
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating booking report: {str(e)}"
        )


@app.get("/reports/rooms")
async def get_room_occupancy_report(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get room occupancy statistics and occupancy rate
    """
    # Get token for inter-service calls
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    
    try:
        rooms = await call_service(
            ROOM_SERVICE_URL,
            "rooms",
            headers=auth_header
        )
        
        total_rooms = len(rooms)
        available = sum(1 for r in rooms if r.get("status") == "available")
        booked = sum(1 for r in rooms if r.get("status") == "booked")
        occupied = sum(1 for r in rooms if r.get("status") == "occupied")
        maintenance = sum(1 for r in rooms if r.get("status") == "maintenance")
        
        # Calculate occupancy rate (booked + occupied / total)
        occupancy_rate = ((booked + occupied) / total_rooms * 100) if total_rooms > 0 else 0
        
        return {
            "total_rooms": total_rooms,
            "available": available,
            "booked": booked,
            "occupied": occupied,
            "maintenance": maintenance,
            "occupancy_rate": round(occupancy_rate, 2),
            "chart_data": {
                "labels": ["Available", "Booked", "Occupied", "Maintenance"],
                "data": [available, booked, occupied, maintenance]
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating room report: {str(e)}"
        )


@app.get("/reports/occupancy-rate")
async def get_occupancy_rate_by_date(
    request: Request,
    start_date: str,
    end_date: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get occupancy rate by date range
    
    Calculates daily occupancy rate for the specified date range
    """
    # Get token for inter-service calls
    token = await get_token(request)
    auth_header = {"Authorization": f"Bearer {token}"}
    
    try:
        # Get all rooms
        rooms = await call_service(
            ROOM_SERVICE_URL,
            "rooms",
            headers=auth_header
        )
        total_rooms = len(rooms)
        
        # Get bookings in date range
        bookings = await call_service(
            BOOKING_SERVICE_URL,
            f"bookings?check_in={start_date}&check_out={end_date}",
            headers=auth_header
        )
        
        # Calculate occupancy by date
        start = datetime.fromisoformat(start_date).date()
        end = datetime.fromisoformat(end_date).date()
        current_date = start
        occupancy_by_date = {}
        
        while current_date <= end:
            # Count bookings that overlap with this date
            occupied_count = 0
            for booking in bookings:
                check_in = datetime.fromisoformat(booking.get("check_in", "")).date()
                check_out = datetime.fromisoformat(booking.get("check_out", "")).date()
                status = booking.get("status", "")
                
                if (check_in <= current_date < check_out and 
                    status not in ["cancelled", "checked_out"]):
                    occupied_count += 1
            
            rate = (occupied_count / total_rooms * 100) if total_rooms > 0 else 0
            occupancy_by_date[current_date.isoformat()] = {
                "date": current_date.isoformat(),
                "occupied": occupied_count,
                "available": total_rooms - occupied_count,
                "occupancy_rate": round(rate, 2)
            }
            
            current_date += timedelta(days=1)
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_rooms": total_rooms,
            "occupancy_by_date": occupancy_by_date,
            "chart_data": {
                "labels": sorted(occupancy_by_date.keys()),
                "data": [occupancy_by_date[k]["occupancy_rate"] for k in sorted(occupancy_by_date.keys())]
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating occupancy rate report: {str(e)}"
        )


@app.get("/reports/dashboard")
async def get_dashboard_data(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard summary data with all key metrics
    """
    try:
        # Get all reports
        revenue_data = await get_revenue_report(
            request=request,
            period="month",
            current_user=current_user,
            db=db
        )
        booking_data = await get_booking_report(
            request=request,
            current_user=current_user,
            db=db
        )
        room_data = await get_room_occupancy_report(
            request=request,
            current_user=current_user,
            db=db
        )
        
        # Get customer count
        token = await get_token(request)
        auth_header = {"Authorization": f"Bearer {token}"}
        try:
            customers = await call_service(
                CUSTOMER_SERVICE_URL,
                "customers",
                headers=auth_header
            )
            total_customers = len(customers)
        except:
            total_customers = 0
        
        return {
            "revenue": revenue_data,
            "bookings": booking_data,
            "rooms": room_data,
            "total_customers": total_customers,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating dashboard data: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "report-service"}
