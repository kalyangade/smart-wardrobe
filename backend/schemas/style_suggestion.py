from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StyleSuggestionRequest(BaseModel):
    focus: str = "occasion"     # occasion, color_variety, capsule_wardrobe


class MissingItem(BaseModel):
    name: str
    category: str
    why: str


class StyleSuggestionResponse(BaseModel):
    id: int
    suggestion_text: str
    missing_items: list[MissingItem]
    occasion: Optional[str]
    focus: Optional[str]
    generated_at: datetime
    was_helpful: Optional[bool]

    class Config:
        from_attributes = True


class StyleSuggestionFeedback(BaseModel):
    was_helpful: bool
