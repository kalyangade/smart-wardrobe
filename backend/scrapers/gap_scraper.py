import json
import re
import logging
from bs4 import BeautifulSoup
from scrapers.base_scraper import BaseScraper, guess_category

logger = logging.getLogger(__name__)

SALE_URL = "https://www.gap.com/browse/category.do?cid=1059663&mlink=5151,m_msl_men_tab_sale"


class GapScraper(BaseScraper):
    store_name = "Gap"
    base_url = "https://www.gap.com"

    async def fetch_deals(self) -> list[dict]:
        try:
            html = await self._get(SALE_URL)
        except RuntimeError as e:
            logger.warning(f"Gap scraper failed: {e}")
            return []

        soup = BeautifulSoup(html, "lxml")
        deals = []

        # Gap embeds structured data in LD+JSON scripts
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = []

                if data.get("@type") == "Product":
                    items = [data]
                elif data.get("@type") == "ItemList":
                    items = [e.get("item", {}) for e in data.get("itemListElement", [])]

                for item in items[:15]:
                    name = item.get("name", "")
                    if not name:
                        continue

                    offers = item.get("offers", {})
                    if isinstance(offers, list):
                        offers = offers[0] if offers else {}

                    price = float(offers.get("price", 0))
                    if price <= 0:
                        continue

                    # Try to find a high price (original) in offer list
                    all_offers = item.get("offers", [])
                    if isinstance(all_offers, list) and len(all_offers) > 1:
                        prices = [float(o.get("price", 0)) for o in all_offers if o.get("price")]
                        orig_price = max(prices) if prices else round(price / 0.6, 2)
                    else:
                        orig_price = round(price / 0.6, 2)

                    discount = round((orig_price - price) / orig_price * 100) if orig_price > price else 30

                    if discount < 20:
                        continue

                    url = item.get("url", "")
                    image = item.get("image", "")
                    if isinstance(image, list):
                        image = image[0] if image else ""

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
                        "image_url": image,
                    })
            except (json.JSONDecodeError, ValueError, KeyError):
                continue

        # Fallback: parse HTML product cards
        if not deals:
            for card in soup.select(".product-card, .plp-product-card")[:15]:
                try:
                    name_el = card.select_one(".product-card__name, .product-name")
                    price_el = card.select_one(".current-price, .sale-price")
                    orig_el = card.select_one(".original-price, .was-price")
                    link_el = card.select_one("a[href]")
                    img_el = card.select_one("img")

                    if not (name_el and price_el):
                        continue

                    name = name_el.get_text(strip=True)
                    price_text = re.sub(r"[^\d.]", "", price_el.get_text())
                    price = float(price_text)

                    orig_price = price
                    if orig_el:
                        orig_text = re.sub(r"[^\d.]", "", orig_el.get_text())
                        if orig_text:
                            orig_price = float(orig_text)

                    if orig_price <= price:
                        continue

                    discount = round((orig_price - price) / orig_price * 100)

                    deals.append({
                        "name": name[:200],
                        "store": self.store_name,
                        "url": self.base_url + (link_el["href"] if link_el and link_el.get("href", "").startswith("/") else ""),
                        "price": price,
                        "original_price": orig_price,
                        "discount_percent": discount,
                        "category": guess_category(name),
                        "color_name": "",
                        "color_hex": "#888888",
                        "image_url": img_el.get("src", "") if img_el else "",
                    })
                except (ValueError, AttributeError, KeyError):
                    continue

        logger.info(f"Gap: parsed {len(deals)} deals")
        return deals
