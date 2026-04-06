from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base


class StyleSuggestion(Base):
    __tablename__ = "style_suggestions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    suggestion_text = Column(Text)
    suggested_items = Column(Text)      # JSON list of clothing_item_ids
    missing_items = Column(Text)        # JSON list of {name, category, why}
    occasion = Column(String(100))
    focus = Column(String(50))          # occasion, color_variety, capsule_wardrobe
    generated_at = Column(DateTime, default=func.now())
    was_helpful = Column(Boolean, nullable=True)
