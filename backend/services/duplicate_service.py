from sqlalchemy.orm import Session
from sqlalchemy import func
from models.clothing import ClothingItem
from schemas.clothing import DuplicateWarning
from schemas.analytics import DuplicateGroup
from config import get_settings

settings = get_settings()


def check_duplicates(db: Session, color_family: str, category: str) -> DuplicateWarning | None:
    """
    Check if adding an item with this color_family + category would hit the duplicate threshold.
    Returns a DuplicateWarning if it would, else None.
    """
    existing = (
        db.query(ClothingItem)
        .filter(
            ClothingItem.color_family == color_family,
            ClothingItem.category == category,
            ClothingItem.is_active == True,
        )
        .all()
    )

    count = len(existing)
    # Warn when adding this item would reach the threshold
    if count >= settings.DUPLICATE_THRESHOLD - 1:
        item_names = [i.name for i in existing]
        return DuplicateWarning(
            color=color_family,
            category=category,
            count=count,
            existing_items=item_names,
            message=f"You already have {count} {color_family} {category}. Consider a different color!",
        )
    return None


def get_all_duplicate_groups(db: Session) -> list[DuplicateGroup]:
    """Return all color+category groups that exceed the duplicate threshold."""
    rows = (
        db.query(
            ClothingItem.color_family,
            ClothingItem.category,
            func.count(ClothingItem.id).label("count"),
        )
        .filter(ClothingItem.is_active == True)
        .group_by(ClothingItem.color_family, ClothingItem.category)
        .having(func.count(ClothingItem.id) >= settings.DUPLICATE_THRESHOLD)
        .all()
    )

    groups = []
    for row in rows:
        items = (
            db.query(ClothingItem.name)
            .filter(
                ClothingItem.color_family == row.color_family,
                ClothingItem.category == row.category,
                ClothingItem.is_active == True,
            )
            .all()
        )
        groups.append(
            DuplicateGroup(
                color_family=row.color_family,
                category=row.category,
                count=row.count,
                items=[i.name for i in items],
            )
        )
    return groups
