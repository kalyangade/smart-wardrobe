from pydantic import BaseModel
from typing import Optional


class AnalyticsSummaryResponse(BaseModel):
    total_items: int
    total_value: float
    avg_cost_per_wear: float
    total_times_worn: int


class CategoryBreakdownItem(BaseModel):
    category: str
    count: int
    percentage: float


class ColorDistributionItem(BaseModel):
    color_name: str
    color_hex: str
    count: int
    is_oversaturated: bool


class WornRankingItem(BaseModel):
    id: int
    name: str
    times_worn: int
    cost_per_wear: float
    image_path: Optional[str]
    category: Optional[str]


class DuplicateGroup(BaseModel):
    color_family: str
    category: str
    count: int
    items: list[str]
