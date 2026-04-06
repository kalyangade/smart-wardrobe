import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.style_suggestion import StyleSuggestion
from schemas.style_suggestion import (
    StyleSuggestionRequest,
    StyleSuggestionResponse,
    StyleSuggestionFeedback,
    MissingItem,
)
from services import ai_service, analytics_service

router = APIRouter(prefix="/api/style-suggestions", tags=["style-suggestions"])


def _to_response(s: StyleSuggestion) -> StyleSuggestionResponse:
    missing = []
    try:
        raw = json.loads(s.missing_items or "[]")
        missing = [MissingItem(**m) for m in raw]
    except (json.JSONDecodeError, TypeError):
        pass

    return StyleSuggestionResponse(
        id=s.id,
        suggestion_text=s.suggestion_text or "",
        missing_items=missing,
        occasion=s.occasion,
        focus=s.focus,
        generated_at=s.generated_at,
        was_helpful=s.was_helpful,
    )


@router.get("", response_model=list[StyleSuggestionResponse])
def get_suggestions(db: Session = Depends(get_db)):
    suggestions = (
        db.query(StyleSuggestion)
        .order_by(StyleSuggestion.generated_at.desc())
        .limit(10)
        .all()
    )
    return [_to_response(s) for s in suggestions]


@router.post("/generate", response_model=list[StyleSuggestionResponse])
def generate_suggestions(request: StyleSuggestionRequest, db: Session = Depends(get_db)):
    wardrobe_summary = analytics_service.build_wardrobe_summary(db)

    if wardrobe_summary["total_items"] == 0:
        raise HTTPException(status_code=400, detail="Add some clothes to your wardrobe first!")

    raw_suggestions = ai_service.generate_style_suggestions(wardrobe_summary, request.focus)

    if not raw_suggestions:
        raise HTTPException(status_code=500, detail="Could not generate suggestions. Please try again.")

    created = []
    for s in raw_suggestions:
        suggestion = StyleSuggestion(
            suggestion_text=s.get("suggestion_text", ""),
            missing_items=json.dumps(s.get("missing_items", [])),
            occasion=s.get("occasion", ""),
            focus=request.focus,
        )
        db.add(suggestion)
        created.append(suggestion)

    db.commit()
    for s in created:
        db.refresh(s)

    return [_to_response(s) for s in created]


@router.put("/{suggestion_id}/feedback")
def suggestion_feedback(suggestion_id: int, feedback: StyleSuggestionFeedback, db: Session = Depends(get_db)):
    s = db.query(StyleSuggestion).filter(StyleSuggestion.id == suggestion_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    s.was_helpful = feedback.was_helpful
    db.commit()
    return {"message": "Feedback saved"}
