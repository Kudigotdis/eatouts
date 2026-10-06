r"""
Hungry Lion Menu Image Downloader
==================================
Downloads all menu item images from the Hungry Lion Botswana menu page
and saves them to: C:\Users\Kudzanai\Downloads\Restaurant Menus\Hungry Lion

Just run:   python download_hungry_lion.py
"""

import os
import re
import time
import random
import logging
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# =============================================================================
# CONFIGURATION
# =============================================================================
MENU_URL = "https://hungrylion.co.bw/menu-for-one/"
SAVE_DIR = Path(r"C:\Users\Kudzanai\Downloads\Restaurant Menus\Hungry Lion")

# Polite delay between image downloads (seconds)
MIN_DELAY = 0.5
MAX_DELAY = 1.5

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/125.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}

# =============================================================================
# LOGGING
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("hungrylion")

# =============================================================================
# HELPERS
# =============================================================================
def safe_filename(text, fallback="image"):
    """Turn a URL or text into a safe filename."""
    if not text:
        return fallback
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-") or fallback


def polite_sleep():
    time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))


def safe_request(url, session, retries=3):
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as exc:
            logger.warning(f"Attempt {attempt}/{retries} failed for {url}: {exc}")
            if attempt < retries:
                time.sleep(2 ** attempt)
    logger.error(f"All {retries} attempts failed for {url}")
    return None


# =============================================================================
# IMAGE URL DISCOVERY
# =============================================================================
def find_image_urls(html, base_url):
    soup = BeautifulSoup(html, "html.parser")
    candidates = []

    # ---------- Strategy 1: inside menu-item-like containers ----------
    container_selectors = [
        "[class*='menu-item']",
        "[class*='menuitem']",
        "[class*='product']",
        "[class*='food-item']",
        "[class*='menu_item']",
        "[class*='meal']",
        ".menu-items li",
        ".menu-list li",
    ]
    for sel in container_selectors:
        try:
            for container in soup.select(sel):
                for img in container.find_all("img"):
                    src = (img.get("data-src") or img.get("data-lazy-src")
                           or img.get("src") or "")
                    if src:
                        candidates.append((src, img.get("alt", "")))
        except Exception:
            pass

    if candidates:
        logger.info(f"Strategy 1 (menu containers) found {len(candidates)} images")
        return candidates

    # ---------- Strategy 2: <picture> tags ----------
    for pic in soup.find_all("picture"):
        for source in pic.find_all("source"):
            srcset = source.get("srcset") or source.get("data-srcset")
            if srcset:
                first = srcset.split(",")[0].strip().split(" ")[0]
                candidates.append((first, ""))
        img = pic.find("img")
        if img and img.get("src"):
            candidates.append((img["src"], img.get("alt", "")))

    if candidates:
        logger.info(f"Strategy 2 (picture tags) found {len(candidates)} images")
        return candidates

    # ---------- Strategy 3: <img> with menu-related src ----------
    keywords = ("menu", "product", "item", "food", "meal", "chicken")
    for img in soup.find_all("img"):
        src = (img.get("data-src") or img.get("data-lazy-src")
               or img.get("src") or "")
        if src and any(k in src.lower() for k in keywords):
            candidates.append((src, img.get("alt", "")))

    if candidates:
        logger.info(f"Strategy 3 (keyword match) found {len(candidates)} images")
        return candidates

    # ---------- Strategy 4: all images (last resort) ----------
    for img in soup.find_all("img"):
        src = (img.get("data-src") or img.get("data-lazy-src")
               or img.get("src") or "")
        if src:
            candidates.append((src, img.get("alt", "")))

    logger.info(f"Strategy 4 (all images) found {len(candidates)} images")
    return candidates


# =============================================================================
# MAIN
# =============================================================================
def main():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Saving images to: {SAVE_DIR}")

    session = requests.Session()

    # ---------- Fetch the menu page ----------
    logger.info(f"Fetching menu page: {MENU_URL}")
    r = safe_request(MENU_URL, session)
    if r is None:
        logger.error("Could not fetch the menu page. The site may be blocking "
                     "automated requests.")
        return

    logger.info(f"Page received: {r.status_code}, {len(r.text)} bytes")

    # Save raw HTML for debugging
    html_path = SAVE_DIR / "_page_source.html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(r.text)
    logger.info(f"Saved raw HTML to {html_path}")

    # ---------- Find images ----------
    image_urls = find_image_urls(r.text, MENU_URL)

    if not image_urls:
        logger.warning("No images found on the page.")
        return

    # ---------- De-duplicate ----------
    seen = set()
    unique = []
    for src, alt in image_urls:
        full = urljoin(MENU_URL, src).split("?")[0]
        if full not in seen and full.startswith("http"):
            seen.add(full)
            unique.append((full, alt))

    logger.info(f"Found {len(unique)} unique image URLs")

    # ---------- Download ----------
    success = fail = 0
    for idx, (img_url, alt) in enumerate(unique, start=1):
        parsed = urlparse(img_url)
        ext = os.path.splitext(parsed.path)[1].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"):
            ext = ".jpg"

        base = safe_filename(alt) if alt else safe_filename(
            os.path.splitext(os.path.basename(parsed.path))[0]
        )
        filename = f"{idx:03d}_{base}{ext}"
        filepath = SAVE_DIR / filename

        if filepath.exists():
            logger.info(f"[{idx}/{len(unique)}] Skipping (exists): {filename}")
            continue

        logger.info(f"[{idx}/{len(unique)}] Downloading: {filename}")
        try:
            img_r = session.get(img_url, headers=HEADERS, timeout=30, stream=True)
            img_r.raise_for_status()
            with open(filepath, "wb") as f:
                for chunk in img_r.iter_content(chunk_size=8192):
                    f.write(chunk)
            success += 1
        except Exception as exc:
            logger.error(f"   Failed: {exc}")
            fail += 1

        polite_sleep()

    logger.info("=" * 60)
    logger.info(f"DONE - Downloaded: {success} | Failed: {fail}")
    logger.info(f"Folder: {SAVE_DIR}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()