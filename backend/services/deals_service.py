import asyncio
import logging
from sqlalchemy.orm import Session
from models.deal import Deal
from schemas.deal import DealResponse
from scrapers.amazon_scraper import AmazonScraper
from scrapers.asos_scraper import ASOSScraper
from scrapers.gap_scraper import GapScraper

logger = logging.getLogger(__name__)


async def run_all_scrapers() -> list[dict]:
    """Run all scrapers concurrently and return combined raw deals."""
    scrapers = [AmazonScraper(), ASOSScraper(), GapScraper()]
    results = []

    async def safe_scrape(scraper):
        try:
            deals = await scraper.fetch_deals()
            logger.info(f"{scraper.store_name}: fetched {len(deals)} deals")
            return deals
        except Exception as e:
            logger.warning(f"{scraper.store_name} scraper failed: {e}")
            return []

    all_results = await asyncio.gather(*[safe_scrape(s) for s in scrapers])
    for deals in all_results:
        results.extend(deals)
    return results


def get_active_deals(db: Session, category: str | None = None) -> list[Deal]:
    query = db.query(Deal).filter(Deal.is_active == True)
    if category:
        query = query.filter(Deal.category == category)
    return query.order_by(Deal.relevance_score.desc(), Deal.discount_percent.desc()).all()


def deactivate_old_deals(db: Session):
    db.query(Deal).filter(Deal.is_active == True).update({"is_active": False})
    db.commit()


def save_deals(db: Session, matched_deals: list[dict]):
    for d in matched_deals:
        deal = Deal(
            name=d.get("name", "Unknown Item"),
            store=d.get("store", ""),
            url=d.get("url", ""),
            price=float(d.get("price", 0)),
            original_price=float(d.get("original_price", 0)),
            discount_percent=int(d.get("discount_percent", 0)),
            category=d.get("category", ""),
            color_name=d.get("color_name", ""),
            color_hex=d.get("color_hex", "#888888"),
            match_reason=d.get("match_reason", ""),
            relevance_score=int(d.get("relevance_score", 50)),
            image_url=d.get("image_url", ""),
            is_active=True,
        )
        db.add(deal)
    db.commit()


async def refresh_deals(db: Session, wardrobe_summary: dict):
    """Full pipeline: scrape -> match with Claude -> save."""
    from services.ai_service import match_deals_to_wardrobe

    raw_deals = await run_all_scrapers()

    if not raw_deals:
        logger.warning("No deals scraped — using mock fallback")
        raw_deals = _get_mock_deals()

    try:
        matched = match_deals_to_wardrobe(raw_deals, wardrobe_summary)
    except Exception as e:
        logger.warning(f"Deal matching failed: {e} — saving raw deals")
        matched = raw_deals[:10]

    deactivate_old_deals(db)
    save_deals(db, matched)
    logger.info(f"Saved {len(matched)} matched deals")


def _get_mock_deals() -> list[dict]:
    """Fallback deals shown when scrapers fail (e.g., during dev without internet)."""
    return [
        {
            "name": "Classic White Oxford Shirt",
            "store": "Gap",
            "url": "https://www.gap.com",
            "price": 29.99,
            "original_price": 59.99,
            "discount_percent": 50,
            "category": "Tops",
            "color_name": "White",
            "color_hex": "#f5f5f0",
            "image_url": "",
        },
        {
            "name": "Slim Fit Chino Pants",
            "store": "Amazon",
            "url": "https://www.amazon.com",
            "price": 24.99,
            "original_price": 45.00,
            "discount_percent": 44,
            "category": "Bottoms",
            "color_name": "Olive",
            "color_hex": "#556b2f",
            "image_url": "",
        },
        {
            "name": "Leather Chelsea Boots",
            "store": "ASOS",
            "url": "https://www.asos.com",
            "price": 49.99,
            "original_price": 89.99,
            "discount_percent": 44,
            "category": "Shoes",
            "color_name": "Brown",
            "color_hex": "#6b3a2a",
            "image_url": "",
        },
        {
            "name": "Merino Wool Sweater",
            "store": "Gap",
            "url": "https://www.gap.com",
            "price": 39.99,
            "original_price": 79.99,
            "discount_percent": 50,
            "category": "Tops",
            "color_name": "Burgundy",
            "color_hex": "#800020",
            "image_url": "",
        },
        {
            "name": "Canvas Tote Bag",
            "store": "Amazon",
            "url": "https://www.amazon.com",
            "price": 14.99,
            "original_price": 29.99,
            "discount_percent": 50,
            "category": "Accessories",
            "color_name": "Tan",
            "color_hex": "#d2b48c",
            "image_url": "",
        },
    ]
