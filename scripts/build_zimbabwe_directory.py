"""Build the Zimbabwe runtime payload for the EatOuts app.

Reads the grouped scrape in sources/Zimbabwe/zimbabwe_restaurants_grouped.json
and writes data/restaurant_listings/zimbabwe_runtime_data.{json,js} in the same
shape scripts/build_restaurant_directory.py emits for Botswana, so the client
needs no new code path:

    { region, currency, generatedAt, restaurants[], menuFiles{}, menusRaw{}, logos{} }

Rows are one per (brand, town): a chain present in Harare and Bulawayo becomes
two rows that share one brandKey, which is what js/eatouts-bridge.js resolves
menus by. Prices in the scrape are USD ("$1.57"); the few ZiG/ZWG figures are
converted to USD at the official baseline in assets/Zimbabwe/rates-zig.json so
every price in the payload is a single currency the runtime can convert.

Run: python scripts/build_zimbabwe_directory.py
"""
from __future__ import annotations

import json
import re
import shutil
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_CANDIDATES = (
    ROOT / "sources" / "Zimbabwe" / "zimbabwe_restaurants_grouped.json",
    ROOT / "assets" / "Zimbabwe" / "zimbabwe_restaurants_grouped.json",
)
LISTINGS_DIR = ROOT / "data" / "restaurant_listings"
OUTPUT_PATH = LISTINGS_DIR / "zimbabwe_runtime_data.json"
OUTPUT_JS_PATH = LISTINGS_DIR / "zimbabwe_runtime_data.js"
MANIFEST_PATH = LISTINGS_DIR / "eatouts_manifest.json"
LOCATIONS_JS_PATH = ROOT / "assets" / "Zimbabwe" / "zimbabwe_locations.js"
RATES_PATH = ROOT / "assets" / "Zimbabwe" / "rates-zig.json"
LOGO_SRC_DIR = ROOT / "assets" / "Zimbabwe" / "Zimbabwe Logos"
LOGO_OUT_DIR = ROOT / "assets" / "logo"

REGION = "ZW"
CURRENCY = "USD"
PLACEHOLDER_LOGO = "assets/logo/logo_placement_image.png"
DESCRIPTION_LIMIT = 480
PHOTO_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MONEY_RE = re.compile(r"(\d+(?:[.,]\d+)?)")
NO_PRICE_RE = re.compile(r"^(poa|sq|market price|as per|tbc|n/a)", re.I)
ZIG_RE = re.compile(r"(zig|zwg|zw\$)", re.I)
LOGO_SUFFIX_RE = re.compile(r"(logo|logos|image|photo)$")


PLACEHOLDER_TEXT = re.compile(r"^(town not identified|area not specified|not specified|town not specified|district not mapped in reference)$", re.I)


def meaningful(value) -> str:
    """Blank out scrape placeholders so they never reach the UI as a town/area."""
    text = clean_text(value)
    return "" if PLACEHOLDER_TEXT.match(text) else text



def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode()
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", text.lower()))


def clean_text(value: str) -> str:
    text = str(value or "").replace("\u00a0", " ").strip()
    return re.sub(r"\s+", " ", text)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8", errors="replace"))


def read_js_payload(path: Path) -> dict:
    """Parse a `window.NAME = {...};` file (zimbabwe_locations.js)."""
    raw = path.read_text(encoding="utf-8", errors="replace")
    return json.loads(raw[raw.find("{"):].rstrip().rstrip(";"))


def load_province_codes() -> dict:
    """district name -> district code, borrowed from zimbabwe_locations.js."""
    if not LOCATIONS_JS_PATH.exists():
        return {}
    try:
        data = read_js_payload(LOCATIONS_JS_PATH)
    except (ValueError, IndexError):
        return {}
    codes = {}
    for district in data.get("districts") or []:
        name = clean_text(district.get("name")).lower()
        code = clean_text(district.get("code"))
        if name and code:
            codes[name] = code
    return codes


def official_rate() -> float:
    """ZiG per USD on the official baseline, straight from rates-zig.json."""
    try:
        rates = read_json(RATES_PATH).get("rates") or {}
        return float((rates.get("official") or {}).get("baseline") or 26.54)
    except (OSError, ValueError, TypeError):
        return 26.54


def parse_price(raw, rate: float):
    """-> USD amount, or None when the menu lists no number (POA, SQ, blank)."""
    text = clean_text(raw)
    if not text or NO_PRICE_RE.match(text):
        return None
    found = MONEY_RE.search(text)
    if not found:
        return None
    try:
        amount = float(found.group(1).replace(",", "."))
    except ValueError:
        return None
    if ZIG_RE.search(text):
        return round(amount / rate, 2)
    return round(amount, 2)


def menu_rows(raw_menu, rate: float) -> list:
    """Flat {category,name,price[,description]} rows.

    index.html's catRowsOf() groups a flat list by `category`, and importedItem()
    drops any row without a numeric price, so POA / SQ / blank rows go here.
    """
    out = []
    seen = set()
    for item in raw_menu or []:
        name = clean_text(item.get("name"))
        if not name:
            continue
        price = parse_price(item.get("price"), rate)
        if price is None:
            continue
        section = clean_text(item.get("section")) or "Menu"
        description = clean_text(item.get("description"))
        signature = (section.lower(), name.lower(), price)
        if signature in seen:
            continue
        seen.add(signature)
        row = {"category": section, "name": name, "price": price}
        if description and len(description) <= 160:
            row["description"] = description
        out.append(row)
    return out


def menu_signature(rows) -> tuple:
    return tuple((r["category"], r["name"].lower(), r["price"]) for r in rows)


def to_float(value):
    text = clean_text(value)
    if not text:
        return None
    try:
        return float(re.sub(r"[^0-9.]", "", text) or 0)
    except ValueError:
        return None


def push_unique(bucket, value):
    text = clean_text(value)
    if text and text not in bucket:
        bucket.append(text)


def collect(source) -> dict:
    """(brand_slug, town_slug) -> everything that brand has in that town."""
    groups = {}
    for district in source.get("districts") or []:
        district_name = meaningful(district.get("name"))
        for town in district.get("towns") or []:
            for area in town.get("areas") or []:
                for brand in area.get("brands") or []:
                    brand_name = clean_text(brand.get("name"))
                    brand_slug = slugify(brand_name)
                    if not brand_slug:
                        continue
                    for loc in brand.get("locations") or []:
                        town_name = (meaningful(loc.get("town")) or meaningful(town.get("name"))
                                     or district_name or "Zimbabwe")
                        town_slug = slugify(town_name) or "unknown"
                        key = (brand_slug, town_slug)
                        group = groups.get(key)
                        if group is None:
                            group = groups[key] = {
                                "brand": brand_slug,
                                "brandName": brand_name,
                                "town": town_name,
                                "townSlug": town_slug,
                                "province": clean_text(loc.get("province")) or district_name,
                                "names": [],
                                "areas": [],
                                "addresses": [],
                                "phones": [],
                                "abouts": [],
                                "cuisines": [],
                                "ratings": [],
                                "reviews": 0,
                                "website": "",
                                "instagram": "",
                                "facebook": "",
                                "menus": [],
                                "count": 0,
                            }
                        group["count"] += 1
                        push_unique(group["names"], loc.get("name"))
                        push_unique(group["areas"], meaningful(loc.get("area")) or meaningful(area.get("name")))
                        push_unique(group["addresses"], loc.get("address"))
                        push_unique(group["abouts"], loc.get("about"))
                        push_unique(group["cuisines"], loc.get("cuisine"))
                        for phone in (loc.get("phones") or [loc.get("phone")]):
                            push_unique(group["phones"], phone)
                        rating = to_float(loc.get("rating"))
                        if rating:
                            group["ratings"].append(rating)
                        group["reviews"] += int(to_float(loc.get("review_count")) or 0)
                        group["website"] = group["website"] or clean_text(loc.get("website"))
                        group["instagram"] = group["instagram"] or clean_text(loc.get("instagram"))
                        group["facebook"] = group["facebook"] or clean_text(loc.get("facebook"))
                        if loc.get("menu"):
                            group["menus"].append(loc["menu"])
    return groups


def description_of(group) -> str:
    """Brand blurb for venue-about's .about-inner: unique scraped 'about' lines,
    capped so one venue cannot carry a whole page of text into the payload."""
    parts = []
    for about in group["abouts"]:
        text = clean_text(about)
        if text and text not in parts:
            parts.append(text)
    return " ".join(parts)[:DESCRIPTION_LIMIT].strip()


def build_rows(groups, province_codes, logo_paths) -> list:
    """One row per (brand, town), same field set Botswana rows use."""
    rows = []
    used = set()
    ordered = sorted(groups.values(), key=lambda g: (g["brand"], -g["count"], g["townSlug"]))
    for group in ordered:
        slug = group["brand"]
        if slug in used:
            slug = group["brand"] + "-" + group["townSlug"]
        if slug in used:
            continue
        used.add(slug)
        province = group["province"]
        contacts = []
        if group["phones"]:
            contacts.append({"label": "Phone", "value": ", ".join(group["phones"][:3])})
        socials = []
        instagram = group["instagram"]
        if instagram:
            if instagram.startswith("@"):
                instagram = "https://instagram.com/" + instagram.lstrip("@")
            socials.append({"platform": "Instagram", "url": instagram})
        if group["facebook"]:
            socials.append({"platform": "Facebook", "url": group["facebook"]})
        cuisines = [name for name in group["cuisines"] if name]
        ratings = group["ratings"]
        rows.append({
            "name": group["brandName"] or group["names"][0],
            "slug": slug,
            "brandKey": group["brand"],
            "town": group["town"],
            "district": province_codes.get(province.lower(), slugify(province)[:3].upper()),
            "districtName": province or "Zimbabwe",
            "areas": group["areas"][:12],
            "addresses": group["addresses"][:12],
            "contacts": contacts,
            "socials": socials,
            "description": description_of(group),
            "website": group["website"],
            "logo": logo_paths.get(group["brand"]) or PLACEHOLDER_LOGO,
            "types": cuisines[:3],
            "category": cuisines[0] if cuisines else "",
            "sources": ["zimbabwe_restaurants_grouped.json"],
            "rating": round(sum(ratings) / len(ratings), 1) if ratings else 0,
            "reviewCount": group["reviews"],
            "region": REGION,
            "currency": CURRENCY,
            "id": "rest_zw_" + slug,
            "area": group["areas"][0] if group["areas"] else "",
            "landmark": "",
        })
    return rows


def build_menus(groups, rate) -> tuple:
    """menuFiles + menusRaw keyed by brand, with brand-town overrides.

    index.html only loads a key that exists in menuFiles, and prefers menusRaw[key]
    when it does, so every key carries the value "inline" (nothing is fetched)."""
    per_brand = defaultdict(list)
    for group in groups.values():
        candidates = [menu_rows(menu, rate) for menu in group["menus"]]
        candidates = [rows for rows in candidates if rows]
        if not candidates:
            continue
        per_brand[group["brand"]].append((group["townSlug"], max(candidates, key=len)))
    files = {}
    raw = {}
    for brand, entries in per_brand.items():
        base = max(entries, key=lambda entry: len(entry[1]))
        raw[brand] = {"menu": base[1]}
        files[brand] = "inline"
        base_signature = menu_signature(base[1])
        for town_slug, rows in entries:
            if menu_signature(rows) == base_signature:
                continue
            key = brand + "-" + town_slug
            raw[key] = {"menu": rows}
            files[key] = "inline"
    return files, raw


def logo_key(name: str) -> str:
    """Collapse a logo filename to a comparable key: `Nandos-Logo.png` -> `nandos`."""
    stem = re.sub(r"\.[a-z0-9]+$", "", name, flags=re.I)
    text = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode().lower()
    return LOGO_SUFFIX_RE.sub("", re.sub(r"[^a-z0-9]+", "", text))


def match_logos(brand_slugs) -> dict:
    """brand slug -> source logo file, matched on the brand name."""
    if not LOGO_SRC_DIR.exists():
        return {}
    files = {}
    for path in sorted(LOGO_SRC_DIR.iterdir()):
        if not path.is_file() or path.suffix.lower() not in PHOTO_SUFFIXES:
            continue
        key = logo_key(path.name)
        if not key or key.startswith("logoplacement"):
            continue
        files[key] = path
    matched = {}
    for slug in brand_slugs:
        target = slug.replace("-", "")
        pick = files.get(target)
        if pick is None:
            best = 0
            for key, path in files.items():
                if len(key) < 6:
                    continue
                if target.startswith(key) or key.startswith(target):
                    if len(key) > best:
                        best, pick = len(key), path
        if pick is not None:
            matched[slug] = pick
    return matched


def stage_logos(matched) -> dict:
    """Copy matched logos to assets/logo/zw-<slug>.<ext>; return slug -> web path."""
    LOGO_OUT_DIR.mkdir(parents=True, exist_ok=True)
    staged = {}
    for slug, path in matched.items():
        suffix = ".jpg" if path.suffix.lower() == ".jpeg" else path.suffix.lower()
        target = LOGO_OUT_DIR / ("zw-" + slug + suffix)
        if not target.exists() or target.stat().st_size != path.stat().st_size:
            shutil.copyfile(path, target)
        staged[slug] = "assets/logo/" + target.name
    return staged


def main() -> None:
    from datetime import datetime, timezone

    source_path = next((path for path in SOURCE_CANDIDATES if path.exists()), None)
    if source_path is None:
        raise SystemExit(
            "Zimbabwe grouped scrape not found. Expected one of:\n  "
            + "\n  ".join(str(path) for path in SOURCE_CANDIDATES)
        )

    rate = official_rate()
    province_codes = load_province_codes()
    groups = collect(read_json(source_path))
    logo_paths = stage_logos(match_logos({group["brand"] for group in groups.values()}))
    menu_files, menus_raw = build_menus(groups, rate)
    restaurants = build_rows(groups, province_codes, logo_paths)

    data = {
        "region": REGION,
        "currency": CURRENCY,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": source_path.name,
        "restaurants": restaurants,
        "menuFiles": menu_files,
        "menusRaw": menus_raw,
        "logos": logo_paths,
    }

    LISTINGS_DIR.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUTPUT_PATH.write_text(payload, encoding="utf-8")
    header = "/* Auto-generated by scripts/build_zimbabwe_directory.py - do not edit manually. */\n"
    header += "/* Zimbabwe listings and menus; loaded via <script> only while the active region is ZW. */\n"
    OUTPUT_JS_PATH.write_text(header + "window.ZIMBABWE_RUNTIME_DATA = " + payload + ";\n", encoding="utf-8")

    items = sum(len(entry.get("menu") or []) for entry in menus_raw.values())
    print(f"Zimbabwe: {len(restaurants)} listings, {len(menu_files)} menu keys, {items} priced items")
    print(f"  ZiG baseline used for conversion: {rate}")
    print(f"  logos staged: {len(logo_paths)} (assets/logo/zw-*)")
    print(f"  payload: {OUTPUT_PATH.relative_to(ROOT)} ({OUTPUT_PATH.stat().st_size / 1048576:.2f} MB)")


if __name__ == "__main__":
    main()
