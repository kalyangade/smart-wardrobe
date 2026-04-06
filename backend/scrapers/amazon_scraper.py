import re
import logging
from bs4 import BeautifulSoup
from scrapers.base_scraper import BaseScraper, guess_category

logger = logging.getLogger(__name__)

# Amazon fashion sale — 30%+ off, sorted by featured
SALE_URL = "https://www.amazon.com/s?i=fashion-mens&rh=p_n_pct-off-with-tax%3A30-100%25&s=review-rank&dc"


class AmazonScraper(BaseScraper):
    store_name = "Amazon"
    base_url = "https://www.amazon.com"

    async def fetch_deals(self) -> list[dict]:
        try:
            html = await self._get(SALE_URL)
        except RuntimeError as e:
            logger.warning(f"Amazon scraper failed: {e}")
            return []

        soup = BeautifulSoup(html, "lxml")
        deals = []

        for result in soup.select("[data-component-type='s-search-result']")[:15]:
            try:
                title_el = result.select_one("h2 a span")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)

                # Price — Amazon has whole + fractional parts
                whole = result.select_one(".a-price-whole")
                fraction = result.select_one(".a-price-fraction")
                if not whole:
                    continue
                price_str = whole.get_text(strip=True).replace(",", "")
                frac_str = fraction.get_text(strip=True) if fraction else "00"
                price = float(f"{price_str}.{frac_str}")

                # Original price (struck through)
                orig_el = result.select_one(".a-text-price .a-offscreen")
                if not orig_el:
                    continue
                orig_price = float(re.sub(r"[^\d.]", "", orig_el.get_text()))

                if orig_price <= price:
                    continue

                discount = round((orig_price - price) / orig_price * 100)
                if discount < 20:
                    continue

                # Product URL
                link_el = result.select_one("h2 a")
                url = self.base_url + link_el["href"] if link_el and link_el.get("href") else ""

                # Image
                img_el = result.select_one("img.s-image")
                image_url = img_el["src"] if img_el else ""

                deals.append({
                    "name": title[:200],
                    "store": self.store_name,
                    "url": url,
                    "price": price,
                    "original_price": orig_price,
                    "discount_percent": discount,
                    "category": guess_category(title),
                    "color_name": "",
                    "color_hex": "#888888",
                    "image_url": image_url,
                })
            except (ValueError, AttributeError, KeyError):
                continue

        logger.info(f"Amazon: parsed {len(deals)} deals")
        return deals
