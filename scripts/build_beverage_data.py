#!/usr/bin/env python3
"""Build the app-ready beverage, alcohol and bar-promo data sets.

Sources (raw) live under assets/data/source/ after the Phase 0 move:
  - Beverages.json                    (231 rows, echoppies + juice merged)
  - Alcohols.json                     (402 rows, Makro)
  - beverage_and_bar_promotions.js    (ES module <-> rewritten with images)

Outputs (consumed by index.html):
  - assets/data/beverages.json
  - assets/data/alcohols.json
  - assets/data/beverage-and-bar-promotions.json
  - assets/data/source/beverage_and_bar_promotions.js (regenerated in sync)

Image files are matched by basename against the real local folders:
  - assets/images/beverages/   (was assets/images/beverage_images/)
  - assets/images/alcohol/     (was assets/images/images/)
  - assets/images/beverage-promos/ and assets/images/alcohol-promos/ (kept)

Run:  python scripts/build_beverage_data.py
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "data", "source")
OUT = os.path.join(ROOT, "assets", "data")
IMG_BEV = os.path.join(ROOT, "assets", "images", "beverages")
IMG_ALC = os.path.join(ROOT, "assets", "images", "alcohol")
IMG_BEV_PROMO = os.path.join(ROOT, "assets", "images", "beverage-promos")
IMG_ALC_PROMO = os.path.join(ROOT, "assets", "images", "alcohol-promos")


def read_json(name: str):
    with open(os.path.join(SRC, name), encoding="utf-8") as fh:
        return json.load(fh)


def image_index(folder: str) -> dict:
    """basename(lower) -> actual filename, for files in `folder`."""
    idx = {}
    if os.path.isdir(folder):
        for fn in os.listdir(folder):
            if os.path.isfile(os.path.join(folder, fn)):
                idx[fn.lower()] = fn
    return idx


def basename(path: str) -> str:
    return os.path.basename(str(path).replace("\\", "/")).strip()


def slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")
    return s or "item"


def unique_id(base: str, used: set[str]) -> str:
    """Catalog rows repeat (a product shot can appear twice); ids must stay
    unique so the app's cart can address each line separately."""
    candidate = base
    serial = 2
    while candidate in used:
        candidate = f"{base}-{serial}"
        serial += 1
    used.add(candidate)
    return candidate


def money(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    m = re.search(r"(\d+(?:\.\d+)?)", str(value).replace(",", ""))
    return round(float(m.group(1)), 2) if m else None


# ---------------------------------------------------------------- beverages
BEV_SUBCATS = [
    ("fizzy", "Fizzy Drinks", "pop"),
    ("juice", "Fruit Juices", "juice"),
    ("icedtea", "Iced Tea", "tea"),
    ("water", "Water", "water"),
    ("energy", "Energy", "bolt"),
    ("cordials", "Cordials", "squash"),
]


def bev_subcat(name: str) -> str:
    u = name.upper()

    def has(*keys):
        return any(k in u for k in keys)

    # precedence matters: "CHOPPIES CHILL ENERGY DRINK" is Energy, not Fizzy.
    if has("ENERGY", "RED BULL", "MONSTER", "PREDATOR", "POWERADE", "ENERGADE",
           "SPRINTERADE", "BULLET", "REBOOST"):
        return "energy"
    # Schweppes Soda/Tonic Water are mixers -> Fizzy per the brand taxonomy.
    if has("WATER") and not has("DAIRY", "SODA", "TONIC"):
        return "water"
    if has("LIPTON", "BOS", "FUZE", "ICE TEA", "ICED TEA", "TEA "):
        return "icedtea"
    if has("CORDIAL", "SQUASH", "ROSES", "ROSE'S"):
        return "cordials"
    # 100% juices (Rugani, Oros RTD) are Juice even when they name a mixer flavour.
    if has("JUICE", "NECTAR") and not has("SODA", "TONIC"):
        return "juice"
    if has("COKE", "COCA", "COLA", "FANTA", "SPRITE", "SPARLETTA", "STONEY",
           "SCHWEPPES", "SCHW ", "PEPSI", "GINGER", "TONIC", "SODA", "CHILL",
           "IRON BREW", "CREAM SODA", "LEMONADE", "GRAPETISER", "APPLETISER",
           "TWIZZA"):
        return "fizzy"
    return "juice"


def build_beverages():
    rows = read_json("Beverages.json")
    idx = image_index(IMG_BEV)
    items, hidden = [], 0
    used_ids: set[str] = set()
    for r in rows:
        fn = basename(r.get("Local Image", ""))
        actual = idx.get(fn.lower())
        if not actual:  # missing local image -> item is hidden
            hidden += 1
            continue
        sub = bev_subcat(r.get("Item Name", ""))
        # curated rows (e.g. the SORT iced-tea / cordial merge) carry an
        # explicit Category that overrides the name-based heuristic
        cat = str(r.get("Category", "")).upper()
        if "ICED TEA" in cat:
            sub = "icedtea"
        elif "CORDIAL" in cat or "CONCENTRAT" in cat:
            sub = "cordials"
        base = slug(r.get("Item Name", "")) + "-" + slug(str(r.get("Size", "")))
        item_id = unique_id(base, used_ids)
        items.append({
            "id": item_id,
            "name": str(r.get("Item Name", "")).strip(),
            "size": str(r.get("Size", "")).strip(),
            "price": money(r.get("Price (P)")),
            "subcat": sub,
            "image": "assets/images/beverages/" + actual,
            "source": str(r.get("Source", "echoppies.com")).strip(),
        })

    counts = {sid: 0 for sid, _, _ in BEV_SUBCATS}
    for it in items:
        counts[it["subcat"]] += 1

    payload = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "currency": "BWP",
        "subcats": [
            {"id": sid, "name": name, "icon": icon, "count": counts[sid]}
            for sid, name, icon in BEV_SUBCATS
        ],
        "items": items,
    }
    with open(os.path.join(OUT, "beverages.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    print(f"beverages.json: {len(items)} items ({hidden} hidden), "
          + ", ".join(f"{n} {counts[i]}" for i, n, _ in BEV_SUBCATS))
    return payload


# ----------------------------------------------------------------- alcohol
ALC_BUCKETS = [
    ("beer", "Beers & AFBs"),
    ("ciders", "Ciders"),
    ("brandy", "Brandy"),
    ("rum", "Rum"),
    ("vodka", "Vodka"),
    ("wines", "Wines"),
    ("gin", "Gin"),
    ("champagne", "Champagne & MCC"),
    ("spirits", "Spirits"),
    ("tequila", "Tequila"),
    ("liqueurs", "Liqueurs"),
]

LIQUEUR_KEYS = ("LIQUEUR", "CREAM", "JAGERMEISTER", "AMARULA")


def alc_bucket(category: str, name: str) -> str:
    if "TEQUILA" in name.upper():
        return "tequila"
    c = (category or "").strip()
    if c == "Beers and AFBs":
        return "beer"
    if c == "Ciders":
        return "ciders"
    if c == "Brandy":
        return "brandy"
    if c == "Rum":
        return "rum"
    if c == "Vodka":
        return "vodka"
    if c in ("Price Freeze Wines", "Cosy Red Wines", "Wines"):
        return "wines"
    if c == "Gin":
        return "gin"
    if c in ("Champagne and MCC", "Champagne & MCC"):
        return "champagne"
    if c == "Gin and Tequila":
        # the shelf carries tequila on this fixture; Gin bucket stays the 40
        # rows filed under the plain "Gin" category.
        return "tequila"
    if c == "All About Spirits":
        return "liqueurs" if any(k in name.upper() for k in LIQUEUR_KEYS) else "spirits"
    return "spirits"


def build_alcohols():
    rows = read_json("Alcohols.json")
    idx = image_index(IMG_ALC)
    items, hidden = [], 0
    used_ids: set[str] = set()
    for r in rows:
        fn = basename(r.get("Image File", ""))
        actual = idx.get(fn.lower())
        if not actual:
            hidden += 1
            continue
        name = str(r.get("Item Name", "")).strip()
        bucket = alc_bucket(r.get("Category", ""), name)
        base = slug(r.get("Item Name", "")) + "-" + slug(str(r.get("Size", "")))
        item_id = unique_id(base, used_ids)
        items.append({
            "id": item_id,
            "name": name,
            "size": str(r.get("Size", "")).strip(),
            "price": money(r.get("Price (BWP)")),
            "bucket": bucket,
            "image": "assets/images/alcohol/" + actual,
            "source": "makro.co.za",
        })

    counts = {bid: 0 for bid, _ in ALC_BUCKETS}
    for it in items:
        counts[it["bucket"]] += 1

    payload = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "currency": "BWP",
        "buckets": [{"id": bid, "name": name, "count": counts[bid]}
                    for bid, name in ALC_BUCKETS],
        "items": items,
    }
    with open(os.path.join(OUT, "alcohols.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    print(f"alcohols.json: {len(items)} items ({hidden} hidden)")
    for bid, name in ALC_BUCKETS:
        print(f"   {counts[bid]:4d}  {name}")
    return payload


# ------------------------------------------------------------------- promos
PROMO_SUBTYPE = {
    "Beer": "Beers",
    "Spirits": "Spirits",
    "Cider": "Ciders",
    "Soft Drink": "Fizzy Drinks",
}


def promo_subtype(brand: str, category: str) -> str:
    if category == "Soft Drink":
        b = brand.upper()
        if any(k in b for k in ("COCA", "COKE", "FANTA", "SPRITE", "PEPSI")):
            return "Fizzy Drinks"
        return "Cold Drinks"
    return PROMO_SUBTYPE.get(category, category or "Spirits")


def drop_trailing_commas(text: str) -> str:
    """`json.loads` rejects a comma before `]`/`}`; tolerate it so a file
    written by an older revision of this script still parses."""
    out, i, n, in_str = [], 0, len(text), False
    while i < n:
        ch = text[i]
        if in_str:
            out.append(ch)
            if ch == "\\":
                if i + 1 < n:
                    out.append(text[i + 1])
                    i += 2
                    continue
            elif ch == '"':
                in_str = False
            i += 1
            continue
        if ch == '"':
            in_str = True
            out.append(ch)
            i += 1
            continue
        if ch == ",":
            j = i + 1
            while j < n and text[j] in " \t\r\n":
                j += 1
            if j < n and text[j] in "]}":
                i += 1
                continue
        out.append(ch)
        i += 1
    return "".join(out)


def parse_promo_js(path: str):
    """Read the source ES module.

    Supports the hand-written shape (unquoted keys, `//` comments) and the
    generated shape this script rewrites (one JSON object per line)."""
    with open(path, encoding="utf-8") as fh:
        js = fh.read()

    start = js.find("export const promotions")
    if start != -1:
        bracket = js.find("[", start)
        if bracket != -1:
            body = drop_trailing_commas(js[bracket:])
            try:
                rows, _ = json.JSONDecoder().raw_decode(body)
                if isinstance(rows, list) and rows:
                    return [r for r in rows if isinstance(r, dict)]
            except ValueError:
                pass  # commented-out hand-written file -> legacy parser

    entry_re = re.compile(
        r"\{\s*id:\s*\"([^\"]+)\",\s*brand:\s*\"([^\"]+)\",\s*"
        r"category:\s*\"([^\"]+)\",\s*days:\s*\[([^\]]*)\],\s*"
        r"headline:\s*\"((?:[^\"\\]|\\.)*)\",\s*"
        r"copy:\s*\"((?:[^\"\\]|\\.)*)\"",
        re.S,
    )
    rows = []
    for m in entry_re.finditer(js):
        pid, brand, category, days_raw, headline, copy = m.groups()
        rows.append({
            "id": pid,
            "brand": brand,
            "category": category,
            "days": re.findall(r"\"([^\"]+)\"", days_raw),
            "headline": headline,
            "copy": copy,
        })
    if not rows:
        raise SystemExit(f"no promotions parsed from {path}")
    return rows


def write_promo_js(path: str, promos, days):
    """Regenerate the ES module so `subtype` and `images` stay in sync with
    assets/data/beverage-and-bar-promotions.json."""
    lines = [
        "// ============================================================",
        "//  BEVERAGE & BAR PROMOTIONS CATALOG  (auto generated)",
        "//  Regenerated by scripts/build_beverage_data.py - do not edit.",
        "//  Fields: id, brand, category, subtype, sourceCategory,",
        "//          days, headline, copy, images",
        "// ============================================================",
        "",
        "/** Days of the week - matches the order used in `days` arrays. */",
        "export const DAYS_OF_WEEK = " + json.dumps(days, ensure_ascii=False,
                                                    indent=2) + ";",
        "",
        "export const promotions = [",
    ]
    for i, p in enumerate(promos):
        sep = "," if i < len(promos) - 1 else ""
        lines.append("  " + json.dumps(p, ensure_ascii=False) + sep)
    lines.append("];")
    lines.append("")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines))


def build_promos():
    src_path = os.path.join(SRC, "beverage_and_bar_promotions.js")
    rows = parse_promo_js(src_path)

    promos = []
    for r in rows:
        pid = str(r.get("id", "")).strip()
        if not pid:
            continue
        brand = str(r.get("brand", "")).strip()
        # `category` is normalised to "Beverage" on write, so the original
        # drink style only survives in `sourceCategory`.
        source_category = str(r.get("sourceCategory") or r.get("category")
                              or "").strip()
        if not source_category or source_category == "Beverage":
            raise SystemExit(
                "lost the source drink category for " + pid
                + " - restore the original beverage_and_bar_promotions.js "
                  "(e.g. from dist/) before rebuilding")
        images = promo_images(pid)
        for rel in images:
            if not os.path.exists(os.path.join(ROOT, rel)):
                raise SystemExit(f"promo image missing on disk: {rel}")
        promos.append({
            "id": pid,
            "brand": brand,
            "category": "Beverage",
            "subtype": promo_subtype(brand, source_category),
            "sourceCategory": source_category,
            "days": [str(d) for d in (r.get("days") or [])],
            "headline": str(r.get("headline", "")),
            "copy": str(r.get("copy", "")),
            "images": images,
        })

    payload = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "category": "Beverage",
        "promotions": promos,
    }
    with open(os.path.join(OUT, "beverage-and-bar-promotions.json"), "w",
              encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    write_promo_js(src_path, promos,
                   ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
                    "Saturday", "Sunday"])

    withimg = sum(1 for p in promos if p["images"])
    print(f"beverage-and-bar-promotions.json: {len(promos)} promos "
          f"({withimg} with images)")
    return payload


PROMO_FILE_INDEX = {}


def reload_index():
    """Map lowercased promo image filename -> repo-relative path."""
    index = {}
    for folder in (IMG_BEV_PROMO, IMG_ALC_PROMO):
        if not os.path.isdir(folder):
            continue
        for fn in os.listdir(folder):
            if os.path.isfile(os.path.join(folder, fn)):
                rel = os.path.relpath(os.path.join(folder, fn), ROOT).replace("\\", "/")
                index[fn.lower()] = rel
    return index


def promo_images(pid: str):
    out = []
    for fn, rel in PROMO_FILE_INDEX.items():
        stem = re.sub(r"\.(jpg|jpeg|png|webp)$", "", fn)
        if stem == pid or stem.startswith(pid + "-"):
            out.append(rel)
    return sorted(set(out))


def main():
    global PROMO_FILE_INDEX
    os.makedirs(OUT, exist_ok=True)
    PROMO_FILE_INDEX = reload_index()
    build_beverages()
    build_alcohols()
    build_promos()
    print("done.")


if __name__ == "__main__":
    sys.exit(main())