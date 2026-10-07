from __future__ import annotations

import csv
import json
import re
import sqlite3
import unicodedata
from collections import OrderedDict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LISTINGS_DIR = ROOT / "assets" / "data" / "restaurant_listings"
DB_PATH = LISTINGS_DIR / "directory_data.db"
CSV_PATH = LISTINGS_DIR / "listings_export.csv"
CURATED_PATH = LISTINGS_DIR / "eatouts_restaurants_list.json"
MANIFEST_PATH = LISTINGS_DIR / "eatouts_manifest.json"
OUTPUT_PATH = LISTINGS_DIR / "directory_runtime_data.json"
OUTPUT_JS_PATH = LISTINGS_DIR / "directory_runtime_data.js"
FILTER_JSON_PATH = LISTINGS_DIR / "restaurant_types_filter.json"
FILTER_JS_PATH = LISTINGS_DIR / "restaurant_types_filter.js"
MANIFEST_JS_PATH = LISTINGS_DIR / "eatouts_manifest.js"
DEMO_MENU_PATH = ROOT / "demo_info_menu-items-food-beverages.json"
LOGO_DIR = ROOT / "assets" / "logo"
MENU_DIR = ROOT / "assets" / "data" / "menus_data"
MENU_IMAGE_DIR = ROOT / "assets" / "images" / "menu_images"

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
BOILERPLATE_MARKERS = (
    "botswana business directory",
    "local botswana sign in",
    "write a review",
    "update info",
    "reviews q&a",
    "unverified listing",
    "verified listing",
    "data hub botswana",
)

TOWN_MAP = {
    "Gaborone": ("01", "Gaborone"),
    "Maun - Ngamiland East": ("18", "Maun"),
    "Kasane / Chobe National Park": ("16", "Kasane"),
    "Francistown": ("08", "Francistown"),
    "Palapye": ("06", "Palapye"),
    "Mahalapye": ("06", "Mahalapye"),
    "Letlhakane": ("40", "Letlhakane"),
    "Jwaneng": ("24", "Jwaneng"),
    "Lobatse": ("03", "Lobatse"),
    "Molepolole": ("31", "Molepolole"),
    "Serowe": ("06", "Serowe"),
    "Selebi-Phikwe": ("08", "Selebi-Phikwe"),
    "Kanye": ("35", "Kanye"),
    "Bobonong": ("06", "Bobonong"),
    "Tutume": ("08", "Tutume"),
    "Tonota": ("08", "Tonota"),
    "Tshabong": ("37", "Tshabong"),
    "Orapa": ("05", "Orapa"),
    "Nata": ("08", "Nata"),
    "Mochudi": ("25", "Mochudi"),
    "Masunga": ("08", "Masunga"),
    "Ghanzi": ("11", "Ghanzi"),
    "Bokspits": ("37", "Bokspits"),
    "Charles Hill": ("11", "Charles Hill"),
    "Dukwi": ("08", "Dukwi"),
    "Rakops": ("42", "Rakops"),
    "Shakawe": ("17", "Shakawe"),
}

MENU_IMAGE_FOLDERS = {
    "kfc": "KFC",
    "chicken-licken": "chicken_licken",
    "zen-cafe": "Zen Cafe",
    "nandos": "Nandos",
    "hungry-lion": "Hungry Lion",
}
BRAND_LOGOS = {
    "soya": "soya_cafe_logo.jpg",
    "the-yellow-giraffe": "yellow_giraffe_logo.jpg",
    "kfc": "kfc.jpg",
    "nandos": "Nandos-Logo.png",
    "hungry-lion": "hungry_lion_logo.jpg",
    "zen-cafe": "zen_cafe_logo.jpg",
    "bull-and-bush": "bull_and_bush_logo.jpg",
    "game-reserve": "the_game_reserve_logo.jpg",
    "the-game-reserve": "the_game_reserve_logo.jpg",
    "butter-chicken-indian-restaurant": "butter_chicken_indian_restaurant.webp",
    "mozambik": "mozambik_logo.png",
    "spur": "spur_logo.jpg",
    "roco-mamas": "rocos_mamas_logo.png",
    "rocomamas": "rocos_mamas_logo.png",
    "pie-city": "pie_city_logo.jpg",
}


def text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def slugify(value: Any) -> str:
    value = unicodedata.normalize("NFKD", text(value)).encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("&", " and ")
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", value)).strip("-")


def canonical_name(value: Any) -> str:
    key = slugify(value)
    if key.startswith("zen-cafe"):
        return "zen-cafe"
    if key.startswith("bull-and-bush"):
        return "bull-and-bush"
    aliases = {
        "nando-s": "nandos",
        "yellow-giraffe": "the-yellow-giraffe",
        "nando": "nandos",
        "roco-mamas": "rocomamas",
        "bull-and-bush-maun": "bull-and-bush",
        "the-game-reserve-menu": "the-game-reserve",
    }
    return aliases.get(key, key)


def is_boilerplate(value: str) -> bool:
    lower = value.lower()
    return len(value) > 140 or any(marker in lower for marker in BOILERPLATE_MARKERS)


def known_town(value: str) -> tuple[str, str, str] | None:
    lowered = value.casefold()
    candidates = sorted(TOWN_MAP, key=len, reverse=True)
    for key in candidates:
        town = key.split(" - ", 1)[0].split(" / ", 1)[0]
        if key.casefold() in lowered or town.casefold() in lowered:
            code, canonical = TOWN_MAP[key]
            return canonical, code, key
    return None


def clean_town(value: Any, address: Any = "") -> tuple[str, str, str]:
    raw = text(value)
    result = known_town(raw) or known_town(text(address))
    if result:
        return result
    if raw and not is_boilerplate(raw):
        return raw, "", raw
    return "", "", ""


def clean_area(value: Any, address: Any, town: str) -> str:
    raw = text(value)
    if raw and not is_boilerplate(raw):
        return raw[:120]

    address_text = text(address)
    marker = re.search(r"\bAddress\s+(.+)", address_text, flags=re.IGNORECASE)
    if marker:
        address_text = marker.group(1)
    if town:
        match = re.search(re.escape(town), address_text, flags=re.IGNORECASE)
        if match:
            address_text = address_text[:match.start()]
    parts = [text(part) for part in address_text.split(",")]
    parts = [part for part in parts if part and not is_boilerplate(part)]
    parts = [part for part in parts if not re.search(r"\b(p\.?o\.?\s*box|private bag|postal bag)\b", part, flags=re.IGNORECASE)]
    if not parts:
        return ""
    candidate = parts[-1]
    if re.search(r"\b(plot|shop|unit|address|botswana)\b", candidate, flags=re.IGNORECASE):
        return ""
    return candidate[:120]


def find_logo(value: Any, name: str) -> str:
    raw = text(value).replace("\\", "/")
    basename = Path(raw).name
    if basename:
        candidate = next((path for path in LOGO_DIR.iterdir() if path.is_file() and path.name.casefold() == basename.casefold()), None)
        if candidate:
            return candidate.relative_to(ROOT).as_posix()
    expected = BRAND_LOGOS.get(canonical_name(name))
    if expected:
        candidate = LOGO_DIR / expected
        if candidate.is_file():
            return candidate.relative_to(ROOT).as_posix()
    desired = slugify(name)
    if desired:
        for candidate in LOGO_DIR.iterdir():
            if candidate.is_file() and candidate.suffix.lower() in IMAGE_SUFFIXES:
                stem = slugify(candidate.stem)
                if stem == desired or desired in stem or stem in desired:
                    if "logo_placement_image" not in stem:
                        return candidate.relative_to(ROOT).as_posix()
    return ""


def contact_values(row: dict[str, Any]) -> list[dict[str, str]]:
    contacts = []
    for key, label in (("contact_number_call", "Phone"), ("mobile_phone_whatsapp", "WhatsApp")):
        value = text(row.get(key))
        if value:
            contacts.append({"label": label, "value": value})
    return contacts


def social_values(row: dict[str, Any]) -> list[dict[str, str]]:
    fields = (("website_address", "Website"), ("facebook", "Facebook"), ("instagram", "Instagram"),
              ("twitter_x", "X"), ("youtube", "YouTube"), ("tiktok", "TikTok"), ("pinterest", "Pinterest"))
    return [{"platform": label, "url": text(row.get(key))} for key, label in fields if text(row.get(key))]


def new_record(name: Any, town: str = "", district: str = "", district_name: str = "", source: str = "") -> dict[str, Any]:
    return {
        "name": text(name),
        "slug": slugify(name),
        "town": town,
        "district": district,
        "districtName": district_name,
        "areas": [],
        "addresses": [],
        "contacts": [],
        "socials": [],
        "description": "",
        "website": "",
        "logo": "",
        "types": [],
        "category": "",
        "sources": [],
    }


def add_unique(items: list[str], value: Any) -> None:
    candidate = text(value)
    if candidate and candidate not in items:
        items.append(candidate)


def add_source_record(records: OrderedDict, name: Any, town_value: Any, row: dict[str, Any], source: str) -> None:
    name = text(name)
    if not name:
        return
    town, district, district_name = clean_town(town_value, row.get("address"))
    key = (canonical_name(name), slugify(town or "unknown"))
    if key not in records:
        records[key] = new_record(name, town, district, district_name, source)
    record = records[key]
    if not record["town"] and town:
        record["town"], record["district"], record["districtName"] = town, district, district_name
    record["sources"].append(source) if source not in record["sources"] else None

    area = clean_area(row.get("area_neighbourhood") or row.get("area"), row.get("address"), record["town"])
    add_unique(record["areas"], area)
    address = text(row.get("address"))
    if address and not is_boilerplate(address):
        add_unique(record["addresses"], address[:240])
    for contact in contact_values(row):
        if contact not in record["contacts"]:
            record["contacts"].append(contact)
    for social in social_values(row):
        if social not in record["socials"]:
            record["socials"].append(social)

    description = text(row.get("company_description") or row.get("description"))
    if description and not is_boilerplate(description) and not record["description"]:
        record["description"] = description[:600]
    website = text(row.get("website_address") or row.get("website"))
    if website and not is_boilerplate(website) and not record["website"]:
        record["website"] = website[:240]
    if not record["logo"]:
        record["logo"] = find_logo(row.get("logo"), name)
    types = row.get("type") or row.get("types") or []
    if isinstance(types, str):
        types = [part.strip() for part in types.split(",") if part.strip()]
    for kind in types if isinstance(types, list) else []:
        add_unique(record["types"], kind)
    if not record["category"]:
        record["category"] = text(row.get("category"))


def read_sqlite_rows() -> list[dict[str, Any]]:
    if not DB_PATH.exists():
        return []
    connection = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        return [dict(row) for row in connection.execute("SELECT * FROM listings ORDER BY id")]
    finally:
        connection.close()


def read_csv_rows() -> list[dict[str, Any]]:
    if not CSV_PATH.exists():
        return []
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def read_curated_rows() -> list[dict[str, Any]]:
    if not CURATED_PATH.exists():
        return []
    with CURATED_PATH.open("r", encoding="utf-8") as source:
        data = json.load(source)
    rows = []
    for group, listings in data.items():
        town, district, district_name = clean_town(group)
        for listing in listings:
            row = dict(listing)
            row["type"] = [part.strip() for part in text(listing.get("type")).split(",") if part.strip()]
            row["locations"] = listing.get("locations") or []
            rows.append({"town": town or group, "district": district, "districtName": district_name, "row": row})
    return rows


def read_legacy_venues() -> list[str]:
    path = ROOT / "demo_restaurant_list.json"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as source:
        payload = json.load(source)
    return [text(name) for name in payload.get("restaurants", []) if text(name)]


def read_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.exists():
        return {"logos": {}, "extras": [], "names": {}}
    with MANIFEST_PATH.open("r", encoding="utf-8") as source:
        data = json.load(source)
    return {
        "logos": data.get("logos") or {},
        "extras": data.get("extras") or [],
        "names": data.get("names") or {},
    }


def manifest_logo(manifest: dict[str, Any], slug: str) -> str:
    """User-managed logo mapping. Exact slug match wins, then a brand-key
    prefix (kfc -> kfc-maun, nando -> nando-s-gabane, ...)."""
    logos = manifest.get("logos") or {}
    if slug in logos:
        return text(logos[slug])
    for key, path in logos.items():
        if slug.startswith(text(key) + "-"):
            return text(path)
    return ""


def build_menu_raw() -> dict[str, Any]:
    raw: dict[str, Any] = {}
    for key, rel in build_menu_files().items():
        path = ROOT / rel
        if path.is_file():
            try:
                raw[key] = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                pass
    if DEMO_MENU_PATH.is_file():
        try:
            raw["_demo"] = json.loads(DEMO_MENU_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return raw


def write_js(path: Path, namespace: str, payload: str, doc: str = "") -> None:
    header = "/* Auto-generated by scripts/build_restaurant_directory.py - do not edit manually. */\n"
    if doc:
        header += f"/* {doc} */\n"
    path.write_text(header + f"window.{namespace} = {payload};\n", encoding="utf-8")


def add_manifest_extras(records: OrderedDict, manifest: dict[str, Any]) -> None:
    for extra in manifest.get("extras") or []:
        name = text(extra.get("name"))
        if not name:
            continue
        town = text(extra.get("town"))
        record = new_record(name, town, text(extra.get("district")), text(extra.get("districtName")), "eatouts_manifest.json")
        record["district"] = text(extra.get("district")) or text(extra.get("districtName"))
        record["districtName"] = text(extra.get("districtName"))
        record["area"] = text(extra.get("area"))
        record["category"] = text(extra.get("category"))
        record["logo"] = text(extra.get("logo"))
        for kind in (extra.get("types") or []):
            add_unique(record["types"], kind)
        key = (canonical_name(name), slugify(town or "unknown"))
        records.setdefault(key, record)


def menu_key(filename: str) -> str:
    stem = Path(filename).stem
    stem = re.sub(r"\s+menu$", "", stem, flags=re.IGNORECASE)
    return canonical_name(stem)


def build_menu_files() -> dict[str, str]:
    result = {}
    if MENU_DIR.exists():
        for path in sorted(MENU_DIR.glob("*.json")):
            result[menu_key(path.name)] = path.relative_to(ROOT).as_posix()
    zen = MENU_IMAGE_DIR / "Zen Cafe" / "menu_data.json"
    if zen.exists():
        result["zen-cafe"] = zen.relative_to(ROOT).as_posix()
    return result


def build_image_manifest() -> dict[str, list[dict[str, str]]]:
    result = {}
    for key, folder in MENU_IMAGE_FOLDERS.items():
        path = MENU_IMAGE_DIR / folder
        if not path.exists():
            continue
        images = []
        for image in sorted(path.rglob("*")):
            if image.is_file() and image.suffix.lower() in IMAGE_SUFFIXES:
                images.append({"name": image.stem, "key": slugify(image.stem), "path": image.relative_to(ROOT).as_posix()})
        result[key] = images
    return result


def build() -> dict[str, Any]:
    records: OrderedDict[tuple[str, str], dict[str, Any]] = OrderedDict()
    manifest = read_manifest()
    for row in read_curated_rows():
        curated = row["row"]
        town, district, district_name = row["town"], row["district"], row["districtName"]
        base = dict(curated)
        base["area"] = ""
        add_source_record(records, curated.get("name"), town, base, "eatouts_restaurants_list.json")
        record = records[(canonical_name(curated.get("name")), slugify(town or "unknown"))]
        record["district"] = district or record["district"]
        record["districtName"] = district_name or record["districtName"]
        locations = curated.get("locations") or []
        for location in locations:
            add_unique(record["areas"], location)

    for row in read_sqlite_rows():
        add_source_record(records, row.get("name"), row.get("town_city"), row, "directory_data.db")
    for row in read_csv_rows():
        add_source_record(records, row.get("Name"), row.get("Town/City"), {
            "logo": row.get("Logo"), "address": row.get("Address"), "area_neighbourhood": row.get("Area/Neighbourhood"),
            "contact_number_call": row.get("Contact Number / Call"), "mobile_phone_whatsapp": row.get("Mobile phone / WhatsApp"),
            "website_address": row.get("Website address"), "facebook": row.get("Facebook"), "instagram": row.get("Instagram"),
            "twitter_x": row.get("Twitter / X"), "youtube": row.get("YouTube"), "tiktok": row.get("TikTok"),
            "pinterest": row.get("Pinterest"), "company_description": row.get("Company description"),
        }, "listings_export.csv")

    for name in read_legacy_venues():
        if canonical_name(name) not in {"soya", "the-yellow-giraffe"}:
            continue
        if any(key[0] == canonical_name(name) for key in records):
            continue
        add_source_record(records, name, "", {"logo": "soya_cafe_logo.jpg" if canonical_name(name) == "soya" else "yellow_giraffe_logo.jpg"}, "demo_restaurant_list.json")

    add_manifest_extras(records, manifest)

    restaurants = []
    used_slugs: set[str] = set()
    for record in records.values():
        base_slug = slugify(record["name"])
        candidate = base_slug
        if candidate in used_slugs:
            suffix = slugify(record["town"] or record["districtName"] or "branch")
            candidate = f"{base_slug}-{suffix}"
            serial = 2
            while candidate in used_slugs:
                candidate = f"{base_slug}-{suffix}-{serial}"
                serial += 1
        record["slug"] = candidate
        used_slugs.add(candidate)
        names = manifest.get("names") or {}
        if candidate in names:
            record["name"] = text(names[candidate])
        record["id"] = "rest_" + record["slug"]
        record["area"] = record["areas"][0] if record["areas"] else ""
        record["landmark"] = record["addresses"][0] if record["addresses"] else ""
        manifest_path = manifest_logo(manifest, candidate)
        if manifest_path:
            record["logo"] = manifest_path
        restaurants.append(record)

    return {
        "generatedAt": None,
        "restaurants": restaurants,
        "seedRows": [
            {
                "n": record["name"],
                "c": record["district"] or record["districtName"] or "",
                "t": record["town"] or record["districtName"] or "",
                "a": (record["areas"] or [""])[0],
                "m": (record["addresses"] or [""])[0],
            }
            for record in restaurants
        ],
        "menuFiles": build_menu_files(),
        "menuImages": build_image_manifest(),
        "menusRaw": build_menu_raw(),
    }


def main() -> None:
    manifest = read_manifest()
    data = build()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUTPUT_PATH.write_text(payload, encoding="utf-8")
    write_js(OUTPUT_JS_PATH, "DIRECTORY_RUNTIME_DATA", payload, "Full restaurant directory + menus, loaded via <script> so file:// works too.")
    if FILTER_JSON_PATH.exists():
        filter_payload = FILTER_JSON_PATH.read_text(encoding="utf-8").strip()
        write_js(FILTER_JS_PATH, "RESTAURANT_TYPES_FILTER_DATA", filter_payload, "Cuisine type filter copy of restaurant_types_filter.json.")
    manifest_payload = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
    write_js(MANIFEST_JS_PATH, "EATOUTS_MANIFEST", manifest_payload, "Hand-maintained logo mapping + extra listings (edit eatouts_manifest.json).")
    used = set()
    for record in data["restaurants"]:
        if record.get("logo"):
            used.add(record["logo"])
    missing = []
    for p in sorted(LOGO_DIR.iterdir()):
        rel = p.relative_to(ROOT).as_posix()
        if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES and rel not in used:
            missing.append(rel)
    print(f"Directory ready: {len(data['restaurants'])} restaurants, {sum(map(len, data['menuImages'].values()))} menu images")
    print(f"Logos applied: {len(used)} distinct logo files in use; unused real logo files: {len(missing)}")
    for path in missing:
        print(f"  unused: {path}")
    merge_owner_submissions()


def merge_owner_submissions() -> None:
    """Ingest owner_submissions/venue_*.json into the runtime directory that
    was just written (integration_file.txt section 6.1 / plan task A2). The
    merge logic itself lives in merge_submissions.py so the intake export and
    this build entry point share one implementation."""
    try:
        from merge_submissions import main as merge_main
    except ImportError:  # executed as a package module
        from scripts.merge_submissions import main as merge_main  # type: ignore
    merge_main()


if __name__ == "__main__":
    main()
