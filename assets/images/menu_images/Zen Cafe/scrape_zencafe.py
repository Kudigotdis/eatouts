r"""
Zen Cafe Menu Scraper (fast version)
=====================================
Reads the item list from each tab, constructs image URLs from the
category + item name, downloads images. No clicking needed.

Run:  python scrape_zencafe.py
"""

import os
import re
import csv
import time
import logging
import json
from pathlib import Path
from urllib.parse import urlparse, unquote

from playwright.sync_api import sync_playwright

PAGES = {
    "food_menu": "https://zencafe.co.bw/menu",
    "bar_menu":  "https://zencafe.co.bw/experience",
}

SAVE_DIR = Path(r"C:\Users\Kudzanai\Downloads\Restaurant Menus\Zen Cafe")
IMAGES_DIR = SAVE_DIR / "images"
PAGE_TIMEOUT = 60000
TAB_WAIT = 2.5

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("zencafe")


def safe_filename(text, fallback="image"):
    if not text:
        return fallback
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")[:80] or fallback


def slugify(text):
    if not text:
        return ""
    text = text.lower().strip()
    text = text.replace("&", " and ")
    text = re.sub(r"[^\w\s-]", " ", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def normalise_next_url(u):
    if not u:
        return None
    if "/_next/image" in u:
        m = re.search(r"[?&]url=([^&]+)", u)
        if m:
            u = unquote(m.group(1))
    if u.startswith("/"):
        u = "https://zencafe.co.bw" + u
    if not u.startswith("http"):
        return None
    return u


def find_tabs(page):
    buttons = page.query_selector_all("button")
    tabs = []
    for i, btn in enumerate(buttons):
        try:
            txt = btn.inner_text().strip()
            cls = btn.get_attribute("class") or ""
            if not txt or len(txt) > 60:
                continue
            if "rounded-full" not in cls:
                continue
            if not btn.is_visible():
                continue
            tabs.append((i, txt, btn))
        except Exception:
            continue
    return tabs


def get_items_and_visible_images(page):
    data = page.evaluate("""
        () => {
            const items = [];
            const lis = document.querySelectorAll('ul li[data-cursor="true"]');
            for (const li of lis) {
                const h4 = li.querySelector('h4');
                const priceEl = li.querySelector('span.font-subhead');
                const p = li.querySelector('p');
                items.push({
                    name: h4 ? h4.innerText.trim() : null,
                    price: priceEl ? priceEl.innerText.trim() : null,
                    description: p ? p.innerText.trim() : null,
                });
            }
            const map = {};
            const imgs = document.querySelectorAll('div[data-cursor="true"][style*="rotateY"] img');
            for (const img of imgs) {
                const alt = img.alt || '';
                const src = img.src || img.getAttribute('src') || '';
                if (alt && src) map[alt] = src;
            }
            return { items, map };
        }
    """)
    return data.get("items", []), data.get("map", {})


def try_download(context, url, filepath):
    if not url:
        return False
    try:
        r = context.request.get(url, timeout=15000)
        if r.ok and len(r.body()) > 500:
            with open(filepath, "wb") as f:
                f.write(r.body())
            return True
    except Exception:
        pass
    return False


def candidate_urls(page_name, category, item_name):
    cat_slug = slugify(category)
    item_slug = slugify(item_name)
    if not item_slug:
        return []
    base = "menu" if page_name == "food_menu" else "bar-menu"
    return [
        f"https://zencafe.co.bw/{base}/{cat_slug}/{item_slug}-01.jpg",
        f"https://zencafe.co.bw/{base}/{cat_slug}/{item_slug}.jpg",
        f"https://zencafe.co.bw/{base}/{cat_slug}/{item_slug}-02.jpg",
    ]


def scrape_page(page, context, page_name, url):
    logger.info(f"Opening {url}")
    page.goto(url, wait_until="networkidle")
    time.sleep(3)

    for _ in range(4):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.6)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1)

    tabs = find_tabs(page)
    logger.info(f"[{page_name}] Found {len(tabs)} tabs")

    all_items = []
    seen = set()

    for i, (btn_idx, tab_text, btn) in enumerate(tabs):
        try:
            btn.click()
            time.sleep(TAB_WAIT)

            items, alt_map = get_items_and_visible_images(page)
            logger.info(f"[{page_name}] '{tab_text}': {len(items)} items, "
                        f"{len(alt_map)} carousel images")

            for item in items:
                name = item.get("name")
                if not name:
                    continue
                key = (name, item.get("price"))
                if key in seen:
                    continue
                seen.add(key)

                img_url = None
                for alt, src in alt_map.items():
                    if alt.strip().lower() == name.strip().lower():
                        img_url = normalise_next_url(src)
                        break

                item["category"] = tab_text
                item["image_url"] = img_url
                item["page_name"] = page_name
                all_items.append(item)
        except Exception as exc:
            logger.warning(f"[{page_name}] Tab '{tab_text}': {exc}")

    logger.info(f"[{page_name}] Total items: {len(all_items)}")
    return all_items


def main():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    if IMAGES_DIR.exists():
        for f in IMAGES_DIR.iterdir():
            if f.is_file():
                f.unlink()
    logger.info(f"Saving to: {SAVE_DIR}")

    all_data = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"),
            viewport={"width": 1500, "height": 1000},
        )
        page = context.new_page()
        page.set_default_timeout(PAGE_TIMEOUT)

        for page_name, url in PAGES.items():
            all_data[page_name] = scrape_page(page, context, page_name, url)

        logger.info("=" * 60)
        logger.info("Downloading images...")
        logger.info("=" * 60)

        ok = fail = constructed = 0
        seen_img_urls = set()

        for page_name, items in all_data.items():
            for item in items:
                name = item.get("name")
                cat = item.get("category")
                page_n = item.get("page_name")

                filename = safe_filename(name) + ".jpg"
                filepath = IMAGES_DIR / filename

                img_url = item.get("image_url")

                if img_url and img_url in seen_img_urls:
                    item["image_url"] = img_url
                    continue

                candidates = []
                if img_url:
                    candidates.append(img_url)
                candidates.extend(candidate_urls(page_n, cat, name))

                saved = False
                for url in candidates:
                    if url in seen_img_urls:
                        continue
                    if try_download(context, url, filepath):
                        item["image_url"] = url
                        seen_img_urls.add(url)
                        saved = True
                        if url == img_url:
                            ok += 1
                        else:
                            constructed += 1
                        logger.info(f"  OK  {filename}")
                        break

                if not saved:
                    item["image_url"] = None
                    fail += 1

        browser.close()

    with open(SAVE_DIR / "menu_data.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    with open(SAVE_DIR / "menu_data.csv", "w", newline="",
              encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["page", "category", "name", "price",
                    "description", "image_url"])
        for page_name, items in all_data.items():
            for item in items:
                w.writerow([item.get("page_name"),
                            item.get("category"),
                            item.get("name"),
                            item.get("price"),
                            item.get("description"),
                            item.get("image_url")])

    logger.info("=" * 60)
    total = sum(len(v) for v in all_data.values())
    logger.info(f"DONE - Items: {total} | Images: {ok + constructed} "
                f"(carousel: {ok}, constructed: {constructed}, no image: {fail})")
    for k, v in all_data.items():
        logger.info(f"  {k}: {len(v)} items")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()