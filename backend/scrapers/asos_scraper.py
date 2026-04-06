import json
import logging
from bs4 import BeautifulSoup
from scrapers.base_scraper import BaseScraper, guess_category

logger = logging.getLogger(__name__)

SALE_URL = "https://www.asos.com/men/sale/cat/?cid=7048&nlid=mw|sale|shop+sale&currentpricerange=1-1000&sort=freshness"


class ASOSScraper(BaseScraper):
    store_name = "ASOS"
    base_url = "https://www.asos.com"

    async def fetch_deals(self) -> list[dict]:
        try:
            html = await self._get(SALE_URL)
        except RuntimeError as e:
            logger.warning(f"ASOS scraper failed: {e}")
            return []

        soup = BeautifulSoup(html, "lxml")
        deals = []

        # ASOS embeds product data in a JSON script tag
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                if data.get("@type") != "ItemList":
                    continue

                for element in data.get("itemListElement", [])[:15]:
                    item = element.get("item", {})
                    name = item.get("name", "")
                    if not name:
                        continue

                    offers = item.get("offers", {})
                    price = float(offers.get("price", 0))
                    if price <= 0:
                        continue

                    # ASOS doesn't always include original price in LD+JSON
                    # Assume 30% discount as minimum since we're scraping the sale section
                    orig_price = round(price / 0.7, 2)
                    discount = 30

                    url = item.get("url", "")
                    image_url = item.get("image", [""])[0] if isinstance(item.get("image"), list) else item.get("image", "")

                    deals.append({
                        "name": name[:200],
                        "store": self.store_name,
                        "url": url,
                        "price": price,
                        "original_price": orig_price,
                        "discount_percent": discount,
                        "category": guess_category(name),
                        "color_name": "",
                        "color_hex": "#888888",
                        "image_url": image_url,
                    })
            except (json.JSONDecodeError, ValueError, KeyError):
                continue

        # Fallback: parse product cards from HTML if no structured data
        if not deals:
            for card in soup.select("article[data-auto-id='productTile']")[:15]:
                try:
                    name_el = card.select_one("[data-auto-id='productTileDescription']")
                    price_el = card.select_one("[data-auto-id='productTilePrice'] span")
                    link_el = card.select_one("a[href]")
                    img_el = card.select_one("img")

                    if not (name_el and price_el):
                        continue

                    name = name_el.get_text(strip=True)
                    price_text = price_el.get_text(strip=True).replace("$", "").replace(",", "")
                    price = float(price_text)
                    orig_price = round(price / 0.65, 2)

                    deals.append({
                        "name": name[:200],
                        "store": self.store_name,
                        "url": self.base_url + (link_el["href"] if link_el else ""),
                        "price": price,
                        "original_price": orig_price,
                        "discount_percent": 35,
                        "category": guess_category(name),
                        "color_name": "",
                        "color_hex": "#888888",
                        "image_url": img_el.get("src", "") if img_el else "",
                    })
                except (ValueError, AttributeError, KeyError):
                    continue

        logger.info(f"ASOS: parsed {len(deals)} deals")
        return deals
