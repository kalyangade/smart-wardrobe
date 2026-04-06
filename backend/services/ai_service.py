import base64
import json
import anthropic
from config import get_settings

settings = get_settings()

ALLOWED_CATEGORIES = ["Tops", "Bottoms", "Shoes", "Accessories", "Outerwear"]
ALLOWED_PATTERNS = ["Solid", "Striped", "Plaid", "Checked", "Floral", "Graphic", "Animal Print"]
ALLOWED_STYLES = ["Casual", "Formal", "Smart Casual", "Sporty", "Streetwear"]
ALLOWED_COLOR_FAMILIES = [
    "Blue", "Red", "Green", "Yellow", "Purple", "Pink",
    "Orange", "Brown", "Black", "White", "Gray", "Neutral"
]

_client = None


def get_claude_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def analyze_image(image_bytes: bytes, mime_type: str) -> dict:
    """
    Send a clothing photo to Claude and get back structured tags.
    Returns a dict with: name, category, color_name, color_hex, color_family, pattern, style, confidence
    """
    client = get_claude_client()
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    system_prompt = f"""You are a clothing recognition AI. Analyze the clothing item in the image and respond with ONLY a valid JSON object. No markdown, no explanation, no extra text.

Use ONLY these exact allowed values:
- category: {ALLOWED_CATEGORIES}
- pattern: {ALLOWED_PATTERNS}
- style: {ALLOWED_STYLES}
- color_family: {ALLOWED_COLOR_FAMILIES}

Respond with this exact JSON shape:
{{"name": "descriptive item name", "category": "...", "color_name": "common color name", "color_hex": "#xxxxxx", "color_family": "...", "pattern": "...", "style": "...", "confidence": 0.0}}"""

    try:
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=300,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": "Analyze this clothing item."},
                    ],
                }
            ],
        )
        raw = response.content[0].text.strip()
        tags = json.loads(raw)
        # Normalize to allowed values with safe fallbacks
        tags["category"] = tags.get("category", "Tops") if tags.get("category") in ALLOWED_CATEGORIES else "Tops"
        tags["pattern"] = tags.get("pattern", "Solid") if tags.get("pattern") in ALLOWED_PATTERNS else "Solid"
        tags["style"] = tags.get("style", "Casual") if tags.get("style") in ALLOWED_STYLES else "Casual"
        tags["color_family"] = tags.get("color_family", "Neutral") if tags.get("color_family") in ALLOWED_COLOR_FAMILIES else "Neutral"
        return tags
    except (json.JSONDecodeError, KeyError, anthropic.APIError):
        # Return safe defaults so the upload still succeeds
        return {
            "name": "Clothing Item",
            "category": "Tops",
            "color_name": "Unknown",
            "color_hex": "#888888",
            "color_family": "Neutral",
            "pattern": "Solid",
            "style": "Casual",
            "confidence": 0.0,
        }


def generate_outfits(wardrobe_items: list[dict], occasion: str, style: str, count: int) -> list[dict]:
    """
    Given wardrobe items as dicts, ask Claude to build outfit combinations.
    Returns list of: {name, occasion, items (list of ids), score, reasoning}
    """
    client = get_claude_client()

    # Send only the fields Claude needs — keep the prompt small
    slim_wardrobe = [
        {"id": i["id"], "name": i["name"], "category": i["category"],
         "color_name": i.get("color_name", ""), "style": i.get("style", "")}
        for i in wardrobe_items
    ]

    valid_ids = {i["id"] for i in wardrobe_items}

    system_prompt = f"""You are a fashion stylist. Given a wardrobe as JSON, create {count} outfit combinations for the occasion "{occasion}" in a "{style}" style.

Rules:
- Only use item IDs that exist in the provided wardrobe
- Each outfit MUST include at least one Top/Outerwear and one Bottom or Shoes
- Vary the combinations — don't repeat the same items in every outfit
- Respond ONLY with a valid JSON array, no markdown, no extra text

Each outfit object:
{{"name": "...", "occasion": "...", "items": [list_of_ids], "score": 0-100, "reasoning": "brief explanation"}}"""

    try:
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1500,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"My wardrobe: {json.dumps(slim_wardrobe)}\n\nGenerate {count} outfits.",
                }
            ],
        )
        raw = response.content[0].text.strip()
        outfits = json.loads(raw)
        # Validate item IDs
        for outfit in outfits:
            outfit["items"] = [i for i in outfit.get("items", []) if i in valid_ids]
        return outfits
    except (json.JSONDecodeError, anthropic.APIError):
        return []


def generate_style_suggestions(wardrobe_summary: dict, focus: str) -> list[dict]:
    """
    Analyze wardrobe gaps and suggest new items to buy.
    Returns list of: {suggestion_text, missing_items: [{name, category, why}], occasion}
    """
    client = get_claude_client()

    focus_desc = {
        "occasion": "occasions they can't dress for with their current wardrobe",
        "color_variety": "adding color diversity to reduce duplicate color groups",
        "capsule_wardrobe": "building a minimal capsule wardrobe with maximum outfit combinations",
    }.get(focus, "overall wardrobe gaps")

    system_prompt = f"""You are a personal stylist. Analyze this wardrobe summary and identify the 3 most impactful items they should add. Focus on: {focus_desc}.

Respond ONLY with a valid JSON array of exactly 3 suggestions, no markdown.

Each suggestion:
{{"suggestion_text": "...", "missing_items": [{{"name": "...", "category": "...", "why": "..."}}], "occasion": "..."}}"""

    try:
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1000,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Wardrobe summary: {json.dumps(wardrobe_summary)}",
                }
            ],
        )
        raw = response.content[0].text.strip()
        return json.loads(raw)
    except (json.JSONDecodeError, anthropic.APIError):
        return []


def match_deals_to_wardrobe(deals: list[dict], wardrobe_summary: dict) -> list[dict]:
    """
    Score raw scraped deals against wardrobe gaps.
    Returns deals enriched with match_reason and relevance_score (only those scoring >= 50).
    """
    client = get_claude_client()
    if not deals:
        return []

    system_prompt = """You are a fashion AI. Given a user's wardrobe summary and a list of sale items, score each item's relevance (0-100) and explain why it fills a wardrobe gap.

Respond ONLY with a valid JSON array — the same items with two added fields: "relevance_score" (int 0-100) and "match_reason" (string). No markdown."""

    try:
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2000,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Wardrobe summary: {json.dumps(wardrobe_summary)}\n\nSale items: {json.dumps(deals[:25])}",
                }
            ],
        )
        raw = response.content[0].text.strip()
        scored = json.loads(raw)
        return [d for d in scored if d.get("relevance_score", 0) >= 50]
    except (json.JSONDecodeError, anthropic.APIError):
        # If Claude fails, return all deals with default scoring
        for d in deals:
            d["relevance_score"] = 50
            d["match_reason"] = "Matches your wardrobe style"
        return deals
