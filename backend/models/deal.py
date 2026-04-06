from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200))
    store = Column(String(100))
    url = Column(String(1000))
    price = Column(Float)
    original_price = Column(Float)
    discount_percent = Column(Integer)
    category = Column(String(50))
    color_name = Column(String(50))
    color_hex = Column(String(7), default="#888888")
    match_reason = Column(Text)         # Claude's explanation of why this fits the wardrobe
    relevance_score = Column(Integer, default=0)  # 0-100 from Claude
    image_url = Column(String(1000))
    is_active = Column(Boolean, default=True)
    fetched_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=True)
