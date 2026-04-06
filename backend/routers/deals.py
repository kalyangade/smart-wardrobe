import asyncio
import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from schemas.deal import DealResponse
from services import deals_service, analytics_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/deals", tags=["deals"])


@router.get("", response_model=list[DealResponse])
def get_deals(category: Optional[str] = None, db: Session = Depends(get_db)):
    deals = deals_service.get_active_deals(db, category=category)

    # If no deals cached yet, trigger a background refresh
    if not deals:
        return []

    return deals


@router.post("/refresh")
def refresh_deals(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Manually trigger a deal refresh. Returns immediately; scraping happens in background."""
    wardrobe_summary = analytics_service.build_wardrobe_summary(db)

    async def _run():
        await deals_service.refresh_deals(db, wardrobe_summary)

    background_tasks.add_task(asyncio.run, _run())
    return {"message": "Deal refresh started in background. Check back in ~30 seconds."}
