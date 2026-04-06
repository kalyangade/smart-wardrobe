from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200))
    occasion = Column(String(100))
    style_score = Column(Float, default=0.0)
    ai_reasoning = Column(Text)         # JSON — Claude's explanation
    feedback = Column(String(10))       # loved, skipped, worn, null
    created_at = Column(DateTime, default=func.now())

    items = relationship("OutfitItem", back_populates="outfit", cascade="all, delete-orphan")


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    outfit_id = Column(Integer, ForeignKey("outfits.id"), nullable=False)
    clothing_item_id = Column(Integer, ForeignKey("clothing_items.id"), nullable=False)
    position = Column(Integer, default=0)   # display order

    outfit = relationship("Outfit", back_populates="items")
