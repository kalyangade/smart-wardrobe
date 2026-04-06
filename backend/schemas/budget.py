from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BudgetSettingsUpdate(BaseModel):
    monthly_limit: float


class BudgetStatusResponse(BaseModel):
    monthly_limit: float
    spent_this_month: float
    remaining: float
    percent_used: float
    is_over_budget: bool
    is_warning: bool
    days_left_in_month: int
    month: str


class PurchaseCreate(BaseModel):
    item_name: str
    amount: float
    category: str = "Other"
    notes: Optional[str] = None


class PurchaseResponse(BaseModel):
    id: int
    item_name: str
    amount: float
    category: Optional[str]
    source: str
    purchased_at: datetime
    notes: Optional[str]
    month: str

    class Config:
        from_attributes = True
