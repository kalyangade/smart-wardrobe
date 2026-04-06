from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from database import Base


class BudgetSettings(Base):
    __tablename__ = "budget_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, default=1)
    monthly_limit = Column(Float, default=200.0)
    month = Column(String(7))           # "2026-04"
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    clothing_item_id = Column(Integer, ForeignKey("clothing_items.id"), nullable=True)
    item_name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    purchased_at = Column(DateTime, default=func.now())
    category = Column(String(50))
    source = Column(String(50), default="external")   # wardrobe_add or external
    notes = Column(Text, nullable=True)
    month = Column(String(7))           # "2026-04" — denormalized for fast queries
