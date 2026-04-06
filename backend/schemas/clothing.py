from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DuplicateWarning(BaseModel):
    color: str
    category: str
    count: int
    existing_items: list[str]
    message: str


class BudgetCheckResult(BaseModel):
    is_over_budget: bool
    is_warning: bool
    spent: float
    limit: float
    remaining_after: float
    message: str


class ClothingItemCreate(BaseModel):
    name: str
    category: str
    color_name: str = ""
    color_hex: str = "#888888"
    color_family: str = ""
    pattern: str = "Solid"
    style: str = "Casual"
    price: float


class ClothingItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    color_family: Optional[str] = None
    pattern: Optional[str] = None
    style: Optional[str] = None
    price: Optional[float] = None


class ClothingItemResponse(BaseModel):
    id: int
    name: str
    category: Optional[str]
    color_name: Optional[str]
    color_hex: Optional[str]
    color_family: Optional[str]
    pattern: Optional[str]
    style: Optional[str]
    price: float
    times_worn: int
    image_path: Optional[str]
    cost_per_wear: float
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_computed(cls, item):
        data = {
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "color_name": item.color_name,
            "color_hex": item.color_hex,
            "color_family": item.color_family,
            "pattern": item.pattern,
            "style": item.style,
            "price": item.price,
            "times_worn": item.times_worn,
            "image_path": item.image_path,
            "cost_per_wear": round(item.price / max(item.times_worn, 1), 2),
            "created_at": item.created_at,
        }
        return cls(**data)


class ClothingUploadResponse(BaseModel):
    item: ClothingItemResponse
    ai_tags: dict
    duplicate_warning: Optional[DuplicateWarning]
    budget_status: BudgetCheckResult
