import calendar
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.budget import BudgetSettings, Purchase
from schemas.budget import BudgetStatusResponse, PurchaseResponse
from schemas.clothing import BudgetCheckResult
from config import get_settings

settings = get_settings()


def get_current_month_key() -> str:
    return datetime.now().strftime("%Y-%m")


def get_or_create_budget(db: Session, month: str | None = None) -> BudgetSettings:
    month = month or get_current_month_key()
    budget = db.query(BudgetSettings).filter(BudgetSettings.month == month).first()
    if not budget:
        # Copy last month's limit if available, else default 200
        last = db.query(BudgetSettings).order_by(BudgetSettings.id.desc()).first()
        limit = last.monthly_limit if last else 200.0
        budget = BudgetSettings(monthly_limit=limit, month=month)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget


def get_monthly_spend(db: Session, month: str) -> float:
    result = (
        db.query(func.sum(Purchase.amount))
        .filter(Purchase.month == month)
        .scalar()
    )
    return float(result or 0.0)


def get_days_left_in_month() -> int:
    today = date.today()
    _, last_day = calendar.monthrange(today.year, today.month)
    return last_day - today.day


def get_budget_status(db: Session) -> BudgetStatusResponse:
    month = get_current_month_key()
    budget = get_or_create_budget(db, month)
    spent = get_monthly_spend(db, month)
    remaining = budget.monthly_limit - spent
    percent_used = (spent / budget.monthly_limit * 100) if budget.monthly_limit > 0 else 0

    return BudgetStatusResponse(
        monthly_limit=budget.monthly_limit,
        spent_this_month=round(spent, 2),
        remaining=round(remaining, 2),
        percent_used=round(percent_used, 1),
        is_over_budget=spent > budget.monthly_limit,
        is_warning=percent_used >= (settings.BUDGET_WARNING_PERCENT * 100),
        days_left_in_month=get_days_left_in_month(),
        month=month,
    )


def check_budget_before_purchase(db: Session, amount: float) -> BudgetCheckResult:
    status = get_budget_status(db)
    remaining_after = status.remaining - amount
    is_over = remaining_after < 0

    if is_over:
        overage = abs(remaining_after)
        message = f"This purchase puts you ${overage:.2f} over your ${status.monthly_limit:.0f} monthly budget!"
    elif status.is_warning:
        message = f"Heads up: you've spent {status.percent_used}% of your budget this month."
    else:
        message = f"${remaining_after:.2f} will remain in your budget after this purchase."

    return BudgetCheckResult(
        is_over_budget=is_over,
        is_warning=status.is_warning or is_over,
        spent=status.spent_this_month,
        limit=status.monthly_limit,
        remaining_after=round(remaining_after, 2),
        message=message,
    )


def record_purchase(
    db: Session,
    item_name: str,
    amount: float,
    category: str,
    clothing_item_id: int | None = None,
    source: str = "external",
    notes: str | None = None,
) -> Purchase:
    month = get_current_month_key()
    purchase = Purchase(
        clothing_item_id=clothing_item_id,
        item_name=item_name,
        amount=amount,
        category=category,
        source=source,
        notes=notes,
        month=month,
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase
