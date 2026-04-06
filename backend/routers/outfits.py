from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.outfit import Outfit, OutfitItem
from models.clothing import ClothingItem
from schemas.outfit import OutfitGenerateRequest, OutfitResponse, OutfitFeedbackRequest
from services import ai_service, analytics_service

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


def _build_response(outfit: Outfit, db: Session) -> OutfitResponse:
    from schemas.outfit import OutfitItemResponse
    from schemas.clothing import ClothingItemResponse

    item_responses = []
    for oi in sorted(outfit.items, key=lambda x: x.position):
        clothing = db.query(ClothingItem).filter(ClothingItem.id == oi.clothing_item_id).first()
        item_responses.append(
            OutfitItemResponse(
                clothing_item_id=oi.clothing_item_id,
                position=oi.position,
                item=ClothingItemResponse.from_orm_with_computed(clothing) if clothing else None,
            )
        )

    return OutfitResponse(
        id=outfit.id,
        name=outfit.name,
        occasion=outfit.occasion,
        style_score=outfit.style_score,
        ai_reasoning=outfit.ai_reasoning,
        feedback=outfit.feedback,
        created_at=outfit.created_at,
        items=item_responses,
    )


@router.get("", response_model=list[OutfitResponse])
def list_outfits(occasion: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Outfit)
    if occasion:
        query = query.filter(Outfit.occasion == occasion)
    return [_build_response(o, db) for o in query.order_by(Outfit.created_at.desc()).all()]


@router.post("/generate", response_model=list[OutfitResponse])
def generate_outfits(request: OutfitGenerateRequest, db: Session = Depends(get_db)):
    """Ask Claude to create outfit combinations from the current wardrobe."""
    wardrobe = db.query(ClothingItem).filter(ClothingItem.is_active == True).all()
    if len(wardrobe) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 items in your wardrobe to generate outfits")

    wardrobe_dicts = [
        {
            "id": i.id, "name": i.name, "category": i.category,
            "color_name": i.color_name, "style": i.style,
        }
        for i in wardrobe
    ]

    ai_outfits = ai_service.generate_outfits(
        wardrobe_items=wardrobe_dicts,
        occasion=request.occasion,
        style=request.style,
        count=request.count,
    )

    if not ai_outfits:
        raise HTTPException(status_code=500, detail="AI could not generate outfits. Please try again.")

    created = []
    for ai_outfit in ai_outfits:
        outfit = Outfit(
            name=ai_outfit.get("name", "New Outfit"),
            occasion=ai_outfit.get("occasion", request.occasion),
            style_score=float(ai_outfit.get("score", 75)),
            ai_reasoning=ai_outfit.get("reasoning", ""),
        )
        db.add(outfit)
        db.flush()  # Get outfit.id before committing

        for pos, item_id in enumerate(ai_outfit.get("items", [])):
            db.add(OutfitItem(outfit_id=outfit.id, clothing_item_id=item_id, position=pos))

        created.append(outfit)

    db.commit()
    for o in created:
        db.refresh(o)

    return [_build_response(o, db) for o in created]


@router.put("/{outfit_id}/feedback")
def outfit_feedback(outfit_id: int, request: OutfitFeedbackRequest, db: Session = Depends(get_db)):
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    if request.feedback not in ("loved", "skipped", "worn"):
        raise HTTPException(status_code=400, detail="feedback must be: loved, skipped, or worn")

    outfit.feedback = request.feedback

    # Mark each item as worn
    if request.feedback == "worn":
        from datetime import datetime
        for oi in outfit.items:
            clothing = db.query(ClothingItem).filter(ClothingItem.id == oi.clothing_item_id).first()
            if clothing:
                clothing.times_worn += 1
                clothing.last_worn_at = datetime.utcnow()

    db.commit()
    return {"message": f"Feedback '{request.feedback}' saved"}
