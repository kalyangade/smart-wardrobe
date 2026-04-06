from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from schemas.clothing import ClothingItemResponse


class OutfitGenerateRequest(BaseModel):
    occasion: str = "Casual"
    style: str = "Casual"
    count: int = 3


class OutfitItemResponse(BaseModel):
    clothing_item_id: int
    position: int
    item: Optional[ClothingItemResponse] = None

    class Config:
        from_attributes = True


class OutfitResponse(BaseModel):
    id: int
    name: str
    occasion: Optional[str]
    style_score: float
    ai_reasoning: Optional[str]
    feedback: Optional[str]
    created_at: datetime
    items: list[OutfitItemResponse] = []

    class Config:
        from_attributes = True


class OutfitFeedbackRequest(BaseModel):
    feedback: str   # loved, skipped, worn
