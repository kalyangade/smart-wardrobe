from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.budget import BudgetSettings, Purchase
from schemas.budget import (
    BudgetSettingsUpdate,
    BudgetStatusResponse,
    PurchaseCreate,
    PurchaseResponse,
)
from services import budget_service

router = APIRouter(prefix="/api/budget", tags=["budget"])


@router.get("/status", response_model=BudgetStatusResponse)
def get_budget_status(db: Session = Depends(get_db)):
    return budget_service.get_budget_status(db)


@router.get("/settings")
def get_budget_settings(db: Session = Depends(get_db)):
    month = budget_service.get_current_month_key()
    b = budget_service.get_or_create_budget(db, month)
    return {"monthly_limit": b.monthly_limit, "month": b.month}


@router.put("/settings")
def update_budget_settings(update: BudgetSettingsUpdate, db: Session = Depends(get_db)):
    if update.monthly_limit <= 0:
        raise HTTPException(status_code=400, detail="Budget must be greater than 0")
    month = budget_service.get_current_month_key()
    b = budget_service.get_or_create_budget(db, month)
    b.monthly_limit = update.monthly_limit
    db.commit()
    return {"monthly_limit": b.monthly_limit, "month": b.month, "message": "Budget updated"}


@router.get("/purchases", response_model=list[PurchaseResponse])
def list_purchases(month: Optional[str] = None, db: Session = Depends(get_db)):
    m = month or budget_service.get_current_month_key()
    purchases = (
        db.query(Purchase)
        .filter(Purchase.month == m)
        .order_by(Purchase.purchased_at.desc())
        .all()
    )
    return purchases


@router.post("/purchases", response_model=PurchaseResponse)
def add_purchase(purchase: PurchaseCreate, db: Session = Depends(get_db)):
    """Log an external purchase (not from photo upload)."""
    p = budget_service.record_purchase(
        db,
        item_name=purchase.item_name,
        amount=purchase.amount,
        category=purchase.category,
        source="external",
        notes=purchase.notes,
    )
    return p
