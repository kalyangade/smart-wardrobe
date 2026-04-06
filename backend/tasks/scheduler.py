import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler()


async def _daily_deal_refresh():
    """Nightly job: scrape deals and match against current wardrobe."""
    from database import SessionLocal
    from services import deals_service, analytics_service

    db = SessionLocal()
    try:
        logger.info("Starting scheduled deal refresh...")
        wardrobe_summary = analytics_service.build_wardrobe_summary(db)
        await deals_service.refresh_deals(db, wardrobe_summary)
        logger.info("Scheduled deal refresh complete")
    except Exception as e:
        logger.error(f"Scheduled deal refresh failed: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        _daily_deal_refresh,
        trigger="cron",
        hour=settings.DEALS_REFRESH_HOUR,
        minute=0,
        id="daily_deal_refresh",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Scheduler started — deals refresh at {settings.DEALS_REFRESH_HOUR}:00 daily")


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
