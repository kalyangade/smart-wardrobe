from sqlalchemy.orm import Session
from sqlalchemy import func
from models.clothing import ClothingItem
from schemas.analytics import (
    AnalyticsSummaryResponse,
    CategoryBreakdownItem,
    ColorDistributionItem,
    WornRankingItem,
)
from config import get_settings

settings = get_settings()


def _active(db: Session):
    return db.query(ClothingItem).filter(ClothingItem.is_active == True)


def get_summary(db: Session) -> AnalyticsSummaryResponse:
    items = _active(db).all()
    total_value = sum(i.price for i in items)
    total_worn = sum(i.times_worn for i in items)
    avg_cpw = total_value / max(total_worn, 1)

    return AnalyticsSummaryResponse(
        total_items=len(items),
        total_value=round(total_value, 2),
        avg_cost_per_wear=round(avg_cpw, 2),
        total_times_worn=total_worn,
    )


def get_category_breakdown(db: Session) -> list[CategoryBreakdownItem]:
    rows = (
        _active(db)
        .with_entities(ClothingItem.category, func.count(ClothingItem.id).label("count"))
        .group_by(ClothingItem.category)
        .all()
    )
    total = sum(r.count for r in rows) or 1
    return [
        CategoryBreakdownItem(
            category=r.category or "Unknown",
            count=r.count,
            percentage=round(r.count / total * 100, 1),
        )
        for r in sorted(rows, key=lambda x: x.count, reverse=True)
    ]


def get_color_distribution(db: Session) -> list[ColorDistributionItem]:
    rows = (
        _active(db)
        .with_entities(
            ClothingItem.color_name,
            ClothingItem.color_hex,
            func.count(ClothingItem.id).label("count"),
        )
        .group_by(ClothingItem.color_name, ClothingItem.color_hex)
        .all()
    )
    return [
        ColorDistributionItem(
            color_name=r.color_name or "Unknown",
            color_hex=r.color_hex or "#888888",
            count=r.count,
            is_oversaturated=r.count >= settings.DUPLICATE_THRESHOLD,
        )
        for r in sorted(rows, key=lambda x: x.count, reverse=True)
    ]


def get_most_worn(db: Session, limit: int = 5) -> list[WornRankingItem]:
    items = _active(db).order_by(ClothingItem.times_worn.desc()).limit(limit).all()
    return [
        WornRankingItem(
            id=i.id,
            name=i.name,
            times_worn=i.times_worn,
            cost_per_wear=round(i.price / max(i.times_worn, 1), 2),
            image_path=i.image_path,
            category=i.category,
        )
        for i in items
    ]


def get_least_worn(db: Session, limit: int = 5) -> list[WornRankingItem]:
    # Exclude brand-new items (0 wears could be new arrivals)
    items = (
        _active(db)
        .filter(ClothingItem.times_worn > 0)
        .order_by(ClothingItem.times_worn.asc())
        .limit(limit)
        .all()
    )
    return [
        WornRankingItem(
            id=i.id,
            name=i.name,
            times_worn=i.times_worn,
            cost_per_wear=round(i.price / max(i.times_worn, 1), 2),
            image_path=i.image_path,
            category=i.category,
        )
        for i in items
    ]


def build_wardrobe_summary(db: Session) -> dict:
    """Build a compact summary for AI prompts (outfits, style suggestions, deal matching)."""
    items = _active(db).all()
    cat_counts: dict[str, int] = {}
    color_counts: dict[str, int] = {}
    styles: list[str] = []

    for item in items:
        cat_counts[item.category or "Other"] = cat_counts.get(item.category or "Other", 0) + 1
        color_counts[item.color_family or "Neutral"] = color_counts.get(item.color_family or "Neutral", 0) + 1
        if item.style:
            styles.append(item.style)

    dominant_styles = sorted(set(styles), key=styles.count, reverse=True)[:3]
    missing_categories = [c for c in ["Tops", "Bottoms", "Shoes", "Accessories", "Outerwear"] if cat_counts.get(c, 0) == 0]

    return {
        "total_items": len(items),
        "category_counts": cat_counts,
        "color_family_counts": color_counts,
        "dominant_styles": dominant_styles,
        "missing_categories": missing_categories,
        "oversaturated_colors": [k for k, v in color_counts.items() if v >= settings.DUPLICATE_THRESHOLD],
    }
