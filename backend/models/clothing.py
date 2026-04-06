from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    category = Column(String(50))       # Tops, Bottoms, Shoes, Accessories, Outerwear
    color_name = Column(String(50))     # Navy, White, Black, etc.
    color_hex = Column(String(7))       # #1a2a5e
    color_family = Column(String(30))   # Blue, Red, Neutral — used for duplicate detection
    pattern = Column(String(50))        # Solid, Striped, Plaid, etc.
    style = Column(String(50))          # Casual, Formal, Smart Casual, Sporty
    price = Column(Float, default=0.0)
    times_worn = Column(Integer, default=0)
    image_path = Column(String(500))    # thumbnail path
    original_image_path = Column(String(500))
    ai_tags_raw = Column(Text)          # raw JSON from Claude
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_worn_at = Column(DateTime, nullable=True)
