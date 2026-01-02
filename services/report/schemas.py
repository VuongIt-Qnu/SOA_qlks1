"""
Report Service - Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReportBase(BaseModel):
    report_type: str
    report_data: Optional[str] = None
    generated_by: Optional[int] = None


class ReportCreate(ReportBase):
    pass


class ReportResponse(ReportBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

