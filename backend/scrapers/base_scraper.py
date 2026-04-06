from abc import ABC, abstractmethod
import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Rough keyword mapping from product titles to our app's categories
CATEGORY_KEYWORDS = {
    "Tops": ["shirt", "tee", "top", "blouse", "polo", "henley", "sweater", "hoodie", "sweatshirt", "jacket", "blazer", "coat"],
    "Bottoms": ["jeans", "pants", "trousers", "shorts", "chinos", "joggers", "leggings", "skirt"],
    "Shoes": ["shoes", "sneakers", "boots", "loafers", "sandals", "heels", "trainers", "oxfords"],
    "Accessories": ["belt", "watch", "scarf", "hat", "cap", "bag", "wallet", "sunglasses", "jewelry"],
    "Outerwear": ["coat", "jacket", "parka", "windbreaker", "trench", "raincoat"],
}


def guess_category(title: str) -> str:
    title_lower = title.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            return category
    return "Tops"  # Default fallback


class BaseScraper(ABC):
    store_name: str = "Unknown"
    base_url: str = ""

    @abstractmethod
    async def fetch_deals(self) -> list[dict]:
        """Fetch sale items and return as list of raw deal dicts."""
        ...

    async def _get(self, url: str, retries: int = 3) -> str:
        """Shared async GET with retry + exponential backoff."""
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0, follow_redirects=True) as client:
            for attempt in range(retries):
                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    return response.text
                except (httpx.HTTPError, httpx.TimeoutException) as e:
                    if attempt == retries - 1:
                        raise RuntimeError(f"Failed to fetch {url} after {retries} attempts: {e}")
                    wait = 2 ** attempt
                    logger.debug(f"Retry {attempt + 1}/{retries} for {url} after {wait}s")
                    await asyncio.sleep(wait)
        return ""
