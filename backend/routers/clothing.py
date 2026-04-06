import json
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.clothing import ClothingItem
from schemas.clothing import (
    ClothingItemCreate,
    ClothingItemUpdate,
    ClothingItemResponse,
    ClothingUploadResponse,
)
from services import ai_service, image_service, duplicate_service, budget_service

router = APIRouter(prefix="/api/clothing", tags=["clothing"])


def _to_response(item: ClothingItem) -> ClothingItemResponse:
    return ClothingItemResponse.from_orm_with_computed(item)


@router.get("", response_model=list[ClothingItemResponse])
def list_clothing(
    category: Optional[str] = None,
    color_family: Optional[str] = None,
    style: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ClothingItem).filter(ClothingItem.is_active == True)
    if category:
        query = query.filter(ClothingItem.category == category)
    if color_family:
        query = query.filter(ClothingItem.color_family == color_family)
    if style:
        query = query.filter(ClothingItem.style == style)
    return [_to_response(i) for i in query.all()]


@router.get("/{item_id}", response_model=ClothingItemResponse)
def get_clothing_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id, ClothingItem.is_active == True
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return _to_response(item)


@router.post("/upload", response_model=ClothingUploadResponse)
async def upload_clothing(
    file: UploadFile = File(...),
    price: float = Form(0.0),
    db: Session = Depends(get_db),
):
    """Main upload endpoint: photo -> AI tags -> duplicate check -> budget check -> save."""
    # 1. Validate and read image
    image_bytes, mime_type = await image_service.validate_and_read_image(file)

    # 2. Save to disk
    original_path, thumb_path = image_service.save_image(image_bytes, mime_type)

    # 3. AI analysis
    ai_tags = ai_service.analyze_image(image_bytes, mime_type)

    # 4. Duplicate check (before saving)
    dupe_warning = duplicate_service.check_duplicates(
        db,
        color_family=ai_tags.get("color_family", "Neutral"),
        category=ai_tags.get("category", "Tops"),
    )

    # 5. Budget check
    budget_check = budget_service.check_budget_before_purchase(db, price)

    # 6. Save item
    item = ClothingItem(
        name=ai_tags.get("name", "Clothing Item"),
        category=ai_tags.get("category"),
        color_name=ai_tags.get("color_name"),
        color_hex=ai_tags.get("color_hex"),
        color_family=ai_tags.get("color_family"),
        pattern=ai_tags.get("pattern"),
        style=ai_tags.get("style"),
        price=price,
        image_path=thumb_path,
        original_image_path=original_path,
        ai_tags_raw=json.dumps(ai_tags),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # 7. Record purchase in budget
    if price > 0:
        budget_service.record_purchase(
            db,
            item_name=item.name,
            amount=price,
            category=item.category or "Other",
            clothing_item_id=item.id,
            source="wardrobe_add",
        )

    return ClothingUploadResponse(
        item=_to_response(item),
        ai_tags=ai_tags,
        duplicate_warning=dupe_warning,
        budget_status=budget_check,
    )


@router.post("", response_model=ClothingItemResponse)
def add_clothing_manual(item_data: ClothingItemCreate, db: Session = Depends(get_db)):
    """Manual add without photo (user fills in all fields)."""
    item = ClothingItem(**item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    if item_data.price > 0:
        budget_service.record_purchase(
            db,
            item_name=item.name,
            amount=item_data.price,
            category=item_data.category,
            clothing_item_id=item.id,
            source="wardrobe_add",
        )
    return _to_response(item)


@router.put("/{item_id}", response_model=ClothingItemResponse)
def update_clothing(item_id: int, updates: ClothingItemUpdate, db: Session = Depends(get_db)):
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.put("/{item_id}/wear", response_model=ClothingItemResponse)
def mark_worn(item_id: int, db: Session = Depends(get_db)):
    """Increment times_worn counter."""
    from datetime import datetime
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.times_worn += 1
    item.last_worn_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/{item_id}")
def delete_clothing(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_active = False   # Soft delete
    db.commit()
    return {"message": "Item removed from wardrobe"}
