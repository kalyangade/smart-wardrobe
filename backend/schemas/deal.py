from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DealResponse(BaseModel):
    id: int
    name: str
    store: str
    url: Optional[str]
    price: float
    original_price: float
    discount_percent: int
    category: Optional[str]
    color_name: Optional[str]
    color_hex: Optional[str]
    match_reason: Optional[str]
    relevance_score: int
    image_url: Optional[str]
    fetched_at: datetime

    class Config:
        from_attributes = True
