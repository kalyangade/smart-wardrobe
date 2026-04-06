from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.analytics import (
    AnalyticsSummaryResponse,
    CategoryBreakdownItem,
    ColorDistributionItem,
    WornRankingItem,
    DuplicateGroup,
)
from services import analytics_service, duplicate_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    return analytics_service.get_summary(db)


@router.get("/categories", response_model=list[CategoryBreakdownItem])
def get_categories(db: Session = Depends(get_db)):
    return analytics_service.get_category_breakdown(db)


@router.get("/colors", response_model=list[ColorDistributionItem])
def get_colors(db: Session = Depends(get_db)):
    return analytics_service.get_color_distribution(db)


@router.get("/most-worn", response_model=list[WornRankingItem])
def get_most_worn(limit: int = 5, db: Session = Depends(get_db)):
    return analytics_service.get_most_worn(db, limit=limit)


@router.get("/least-worn", response_model=list[WornRankingItem])
def get_least_worn(limit: int = 5, db: Session = Depends(get_db)):
    return analytics_service.get_least_worn(db, limit=limit)


@router.get("/duplicates", response_model=list[DuplicateGroup])
def get_duplicates(db: Session = Depends(get_db)):
    return duplicate_service.get_all_duplicate_groups(db)
