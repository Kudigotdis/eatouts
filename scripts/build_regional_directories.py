"""Build the Kenya, Mauritius and South Africa runtime payloads for EatOuts.

Each region gets one payload in exactly the shape scripts/build_zimbabwe_directory.py
already emits for Zimbabwe, so the client needs no new code path:

    { region, currency, generatedAt, source, restaurants[],
      menuFiles{}, menusRaw{}, logos{} }

    KE -> data/restaurant_listings/kenya_runtime_data.{json,js}        window.KENYA_RUNTIME_DATA
    MU -> data/restaurant_listings/mauritius_runtime_data.{json,js}    window.MAURITIUS_RUNTIME_DATA
    ZA -> data/restaurant_listings/southafrica_runtime_data.{json,js}  window.SOUTH_AFRICA_RUNTIME_DATA

Every row is pinned to the region's gazetteer (the *_locations.js file the app
already ships) so the town/city pickers work: a row whose town cannot be
resolved keeps its province/district and an empty town rather than inventing a
place that is not on the map.

Sources (all local scrapes, no network):
    KE  assets/Kenya/all_restaurants.json                  131 dishi.co.ke venues
    MU  assets/Mauritius/restaurants.json                  262 ordermanzer.mu venues
    ZA  assets/South Africa/<id>_<slug>/details.json     1 470 dining-out.co.za venues

South Africa's menu scrape is ~15 MB across 1 470 files, which is far too much
to inline into one script, so menus are inlined in order of completeness until
MENU_BUDGET_BYTES is reached; a venue outside the budget simply shows the
app's existing "menu not yet available" state.

Run: python scripts/build_regional_directories.py
"""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LISTINGS_DIR = ROOT / "data" / "restaurant_listings"

PLACEHOLDER_LOGO = "assets/logo/logo_placement_image.png"
MENU_BUDGET_BYTES = 1500000      # ~1.4 MB of menu JSON inlined for South Africa
DESCRIPTION_LIMIT = 700
MAX_AREAS = 12
MAX_ADDRESSES = 6

WORD_RE = re.compile(r"[^a-z0-9]+")
SIZE_WORDS = "small|medium|large|regular|xl|xxl|single|double"
SIZE_ROW_RE = re.compile(r"^(%s)(\s+(%s))*$" % (SIZE_WORDS, SIZE_WORDS), re.I)
SIZE_TAIL_RE = re.compile(r"(\s+(%s))+\s*$" % SIZE_WORDS, re.I)


def slugify(value) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode()
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", text.lower()))


def norm(value) -> str:
    """Comparison key: lowercase, letters+digits only ('KwaZulu Natal' == 'Kwazulu-Natal')."""
    return WORD_RE.sub("", str(value or "").lower())


def clean_text(value) -> str:
    text = str(value or "").replace("\u00a0", " ").strip()
    return re.sub(r"\s+", " ", text)


def shorten(text: str, limit: int = DESCRIPTION_LIMIT) -> str:
    """Trim to a whole word at the limit — never mid-word."""
    text = clean_text(text)
    if len(text) <= limit:
        return text
    cut = text[:limit]
    space = cut.rfind(" ")
    return (cut[:space] if space > limit * 0.6 else cut).rstrip(" ,;:-") + "…"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8", errors="replace"))


def read_window_js(path: Path) -> dict:
    """Parse a `window.NAME = {...};` file (the gazetteers are shaped that way)."""
    raw = path.read_text(encoding="utf-8", errors="replace")
    return json.loads(raw[raw.find("{"):].rstrip().rstrip(";"))


def parse_amount(value):
    """'R 14.80' / 'KSh 350' / '1,200' / 30 -> float, or None when unknown."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = clean_text(value)
    if not text:
        return None
    if re.search(r"\b(poa|sq|market price|as per|tbc|n/a)\b", text, re.I):
        return None
    if re.match(r"^free$", text, re.I):
        return 0.0
    digits = re.sub(r"[^0-9.]", "", text)
    if not digits:
        return None
    try:
        return float(digits)
    except ValueError:
        return None


def push_unique(bucket: list, value):
    value = clean_text(value)
    if value and value not in bucket:
        bucket.append(value)


class Gazetteer:
    """district code / name / town / area lookups for one country."""

    def __init__(self, path: Path):
        data = read_window_js(path)
        self.districts = []
        self.town_by_key = {}        # norm(town)  -> (code, districtName, townName)
        self.area_by_key = {}        # norm(area)  -> (code, districtName, townName)
        self.towns_by_district = {}  # code -> [(normTown, townName)]
        for d in data.get("districts") or []:
            code = str(d.get("code") or "")
            name = clean_text(d.get("name"))
            self.districts.append((code, name))
            self.towns_by_district[code] = []
            for t in d.get("towns") or []:
                town = clean_text(t.get("name"))
                if not town:
                    continue
                self.towns_by_district[code].append((norm(town), town))
                self.town_by_key.setdefault(norm(town), (code, name, town))
                for a in t.get("areas") or []:
                    self.area_by_key.setdefault(norm(a), (code, name, town))

    def district_code(self, name) -> str:
        key = norm(name)
        for code, dname in self.districts:
            if norm(dname) == key:
                return code
        return ""

    def district_name(self, code) -> str:
        for dcode, dname in self.districts:
            if dcode == str(code):
                return dname
        return ""

    def match(self, hints) -> tuple:
        """First (code, districtName, townName) whose area, then town, matches a hint."""
        keys = [norm(h) for h in hints if clean_text(h)]
        for key in keys:
            hit = self.area_by_key.get(key)
            if hit:
                return hit
        for key in keys:
            hit = self.town_by_key.get(key)
            if hit:
                return hit
        return ("", "", "")

    def match_in_district(self, code, hints) -> str:
        """A town inside `code` that one of the hints names exactly."""
        wanted = {norm(h) for h in hints if clean_text(h)}
        for tkey, town in self.towns_by_district.get(str(code), []):
            if tkey in wanted:
                return town
        return ""

    def town_named(self, name) -> tuple:
        return self.town_by_key.get(norm(name), ("", "", ""))

    def towns_of(self, code) -> list:
        return [town for _key, town in self.towns_by_district.get(str(code), [])]


def row(spec, slug, name, town_code, town_district, town, **extra) -> dict:
    """One payload row in the shared shape (see scripts/build_zimbabwe_directory.py)."""
    record = {
        "name": name,
        "slug": slug,
        "brandKey": slug,
        "town": town,
        "district": town_code,
        "districtName": town_district,
        "areas": [],
        "addresses": [],
        "contacts": [],
        "socials": [],
        "description": "",
        "website": "",
        "logo": PLACEHOLDER_LOGO,
        "types": [],
        "category": "",
        "sources": [spec["source"]],
        "rating": 0,
        "reviewCount": 0,
        "region": spec["region"],
        "currency": spec["currency"],
        "id": "rest_%s_%s" % (spec["region"].lower(), slug),
        "area": "",
        "landmark": "",
    }
    record.update(extra)
    return record


def write_payload(spec, restaurants, menu_files, menus_raw, logos) -> str:
    """Write <region>_runtime_data.json + .js and return a one-line report."""
    data = {
        "region": spec["region"],
        "currency": spec["currency"],
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": spec["source"],
        "restaurants": restaurants,
        "menuFiles": menu_files,
        "menusRaw": menus_raw,
        "logos": logos,
    }
    LISTINGS_DIR.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    json_path = LISTINGS_DIR / (spec["file"] + ".json")
    js_path = LISTINGS_DIR / (spec["file"] + ".js")
    json_path.write_text(payload, encoding="utf-8")

    header = "/* Auto-generated by scripts/build_regional_directories.py - do not edit manually. */\n"
    header += "/* %s listings and menus; loaded via <script> only while the active region is %s. */\n"
    js_path.write_text(header % (spec["region"], spec["region"]) +
                       "window.%s = %s;\n" % (spec["global"], payload), encoding="utf-8")

    items = sum(len(entry.get("menu") or []) for entry in menus_raw.values())
    return "%s: %d listings, %d menu keys, %d menu items, %.2f MB" % (
        spec["region"], len(restaurants), len(menu_files), items,
        json_path.stat().st_size / 1048576,
    )


SPEC_KE = {
    "region": "KE",
    "currency": "KES",
    "file": "kenya_runtime_data",
    "global": "KENYA_RUNTIME_DATA",
    "source": "assets/Kenya/all_restaurants.json",
}
SPEC_MU = {
    "region": "MU",
    "currency": "MUR",
    "file": "mauritius_runtime_data",
    "global": "MAURITIUS_RUNTIME_DATA",
    "source": "assets/Mauritius/restaurants.json",
}
SPEC_ZA = {
    "region": "ZA",
    "currency": "ZAR",
    "file": "southafrica_runtime_data",
    "global": "SOUTH_AFRICA_RUNTIME_DATA",
    "source": "assets/South Africa/details.json",
}


def split_hints(*values) -> list:
    """Comma/slash separated scraped place names, longest first (deepest wins)."""
    out = []
    for value in values:
        for part in re.split(r"[,/|·]", clean_text(value)):
            part = clean_text(part)
            if part:
                out.append(part)
    return out


def type_chips(raw, limit: int = 3) -> list:
    """A long scrape label ('Coastal & international family restaurant') -> chips."""
    chips = []
    for part in re.split(r"[:,]|&| and ", clean_text(raw)):
        part = clean_text(part)
        if not part or len(part) > 32:
            continue
        if part.lower() not in [c.lower() for c in chips]:
            chips.append(part)
        if len(chips) >= limit:
            break
    return chips


def kenya_menu(item, slug) -> list:
    """KE menu rows: one 'Menu' category, size-artefact rows dropped.

    The scrape loses section names (its `category` repeats the dish name) and
    emits a 'Small  Medium  Large' row per sized dish. Those rows carry no dish
    name, so they are dropped; the sizes survive in the description text.
    """
    out = []
    seen = set()
    for entry in item.get("menu_items") or []:
        name = clean_text(entry.get("name"))
        if not name or SIZE_ROW_RE.match(name):
            continue
        description = re.sub(r"^sizes?\s+", "", clean_text(entry.get("description")), flags=re.I)
        description = clean_text(SIZE_TAIL_RE.sub("", description))
        price = parse_amount(entry.get("price"))
        if price is None and not description:
            continue              # nothing to order and nothing to read
        key = (name.lower(), price, description.lower())
        if key in seen:
            continue
        seen.add(key)
        row_item = {"category": "Menu", "name": name}
        if description:
            row_item["description"] = description
        if price is not None:
            row_item["price"] = price
        out.append(row_item)
    return out


def unique_slug(base: str, used: set, suffix: str = "") -> str:
    slug = slugify(base) or "venue"
    if suffix:
        slug = slug + "-" + slugify(suffix)
    candidate = slug
    n = 2
    while candidate in used:
        candidate = "%s-%d" % (slug, n)
        n += 1
    used.add(candidate)
    return candidate


def build_kenya() -> str:
    spec = SPEC_KE
    gaz = Gazetteer(ROOT / "assets" / "Kenya" / "Kenya_Locations.js")
    source = read_json(ROOT / "assets" / "Kenya" / "all_restaurants.json")
    # dishi.co.ke lists Nairobi-metro venues: most are in Nairobi, but Ruiru,
    # Ruaka, Juja and Athi River sit in Kiambu/Machakos, so the gazetteer gets to
    # name the county first and Nairobi is only the fallback.
    nairobi = gaz.district_code("Nairobi")
    nairobi_name = gaz.district_name(nairobi)

    restaurants, menu_files, menus_raw = [], {}, {}
    used = set()
    resolved = 0
    menu_venues = 0

    for item in source:
        name = re.sub(r"\s+menu$", "", clean_text(item.get("name")), flags=re.I) or clean_text(item.get("name"))
        if not name:
            continue
        hints = split_hints(item.get("area"), item.get("location"), item.get("address"))
        code, district, town = gaz.match(hints)
        if not code:
            code, district = nairobi, nairobi_name
            town = gaz.match_in_district(nairobi, hints)
        if town:
            resolved += 1

        slug = unique_slug(name, used, town)
        types = type_chips(item.get("type")) or ["Restaurant"]
        address = clean_text(item.get("address"))
        parts = []
        if clean_text(item.get("type")):
            parts.append(clean_text(item.get("type")) + (" in " + town if town else ""))
        if address:
            parts.append(address)
        if clean_text(item.get("price_range")):
            parts.append(clean_text(item.get("price_range")))
        if clean_text(item.get("hours_text")):
            parts.append(clean_text(item.get("hours_text")))

        menu = kenya_menu(item, slug)
        if menu:
            menus_raw[slug] = {"menu": menu}
            menu_files[slug] = "inline"
            menu_venues += 1

        restaurants.append(row(
            spec, slug, name, code, district, town,
            areas=[clean_text(item.get("area"))] if clean_text(item.get("area")) else [],
            addresses=[address] if address else [],
            description=shorten(" · ".join(parts)),
            website=clean_text(item.get("url")),
            types=types,
            category=types[0],
            area=clean_text(item.get("area")),
        ))

    report = write_payload(spec, restaurants, menu_files, menus_raw, {})
    return report + " | towns resolved %d/%d, menus %d" % (resolved, len(restaurants), menu_venues)


    report = write_payload(spec, restaurants, menu_files, menus_raw, {})
    return report + " | towns resolved %d/%d, menus %d" % (resolved, len(restaurants), menu_venues)


# Mauritius' gazetteer towns are the combined municipal names ("Beau Bassin-Rose
# Hill", "Vacoas-Phoenix", "Central Flacq"), while ordermanzer lists the parts.
# Keys are norm()ed, values must be a real town name from Mauritius_Locations.js.
MU_TOWN_ALIAS = {
    "beaubassin": "Beau Bassin-Rose Hill",
    "rosehill": "Beau Bassin-Rose Hill",
    "beau-bassin": "Beau Bassin-Rose Hill",
    "phoenix": "Vacoas-Phoenix",
    "vacoas": "Vacoas-Phoenix",
    "flacq": "Central Flacq",
    "centralflacq": "Central Flacq",
    "centreflacq": "Central Flacq",
    "quartrebornes": "Quatre Bornes",
    "quatrebornes": "Quatre Bornes",
    "saintpierre": "Saint Pierre",
    "stpierre": "Saint Pierre",
    "moka": "Moka",
    "curepipe": "Curepipe",
    "mahebourg": "Mahebourg",
    # suburbs that belong to one of the towns above
    "ebene": "Quatre Bornes",
    "trianon": "Quatre Bornes",
    "valentina": "Quatre Bornes",
    "mesnil": "Quatre Bornes",
    "floreal": "Curepipe",
    "forestside": "Curepipe",
    "rochesbrunes": "Curepipe",
    "glenpark": "Curepipe",
    "stjean": "Quatre Bornes",
    "montagneory": "Quatre Bornes",
    "sodnac": "Quatre Bornes",
    "pailles": "Port Louis",
    "richeterre": "Port Louis",
    "beauvallon": "Quatre Bornes",
    "pointeauxpiments": "Pointe aux Piments",
    "triolet": "Triolet",
    "tombeaubay": "Tombeau Bay",
    "goodlands": "Goodlands",
    "grandbaie": "Grand Baie",
    "belairrivieresche": "Bel Air Riviere Seche",
    "rosette": "Rose Belle",
    "rosebelle": "Rose Belle",
    "chemingrenier": "Chemin Grenier",
    "souillac": "Souillac",
    "surinam": "Surinam",
}


def build_mauritius() -> str:
    spec = SPEC_MU
    gaz = Gazetteer(ROOT / "assets" / "Mauritius" / "Mauritius_Locations.js")
    source = read_json(ROOT / "assets" / "Mauritius" / "restaurants.json")

    restaurants, menu_files, menus_raw = [], {}, {}
    used = set()
    resolved = 0

    for item in source:
        name = clean_text(item.get("name"))
        if not name:
            continue
        raw_town = clean_text(item.get("town"))
        town = ""
        code, district = "", ""
        alias = MU_TOWN_ALIAS.get(norm(raw_town))
        if alias:
            code, district, town = gaz.town_named(alias)
        if not town:
            hit = gaz.match(split_hints(raw_town, item.get("address")))
            code, district, town = hit
        if town:
            resolved += 1

        slug = unique_slug(name, used, town)

        areas = []
        for area in item.get("delivery_areas") or []:
            push_unique(areas, area)
            if len(areas) >= MAX_AREAS:
                break
        addresses = [clean_text(line) for line in str(item.get("address") or "").split(",") if clean_text(line)][:MAX_ADDRESSES]

        types = type_chips(" ".join(item.get("cuisines") or [])) or ["Restaurant"]
        if item.get("cuisines"):
            types = [clean_text(c) for c in item["cuisines"][:3] if clean_text(c)] or types

        description = shorten(item.get("description"))

        restaurants.append(row(
            spec, slug, name, code, district, town,
            areas=areas,
            addresses=addresses,
            description=description,
            website=clean_text(item.get("url")),
            types=types,
            category=types[0],
            area=areas[0] if areas else "",
        ))

    report = write_payload(spec, restaurants, menu_files, menus_raw, {})
    return report + " | towns resolved %d/%d, no menu data in source" % (resolved, len(restaurants))


# The dining-out hierarchy is inconsistent: some rows are [province, city, suburb,
# area], 610 rows are ["South Africa", province, region] and the Durban rows use
# the metro name as the province. These aliases cover the gaps, keyed by norm().
ZA_PROVINCE_ALIAS = {
    "durbanandsurrounds": "KwaZulu-Natal",
    "kwazulunatal": "KwaZulu-Natal",
    "durban": "KwaZulu-Natal",
}

# City / suburb token -> the municipality the gazetteer actually lists.
ZA_TOWN_ALIAS = {
    "capetown": "City of Cape Town",
    "johannesburg": "City of Johannesburg",
    "joburg": "City of Johannesburg",
    "sandton": "City of Johannesburg",
    "soweto": "City of Johannesburg",
    "roodepoort": "City of Johannesburg",
    "pretoria": "City of Tshwane",
    "tshwane": "City of Tshwane",
    "centurion": "City of Tshwane",
    "durban": "eThekwini",
    "umhlanga": "eThekwini",
    "pinetown": "eThekwini",
    "westville": "eThekwini",
    "hillcrest": "eThekwini",
    "pietermaritzburg": "The Msunduzi",
    "eastlondon": "Buffalo City",
    "gonubie": "Buffalo City",
    "portelizabeth": "Nelson Mandela Bay",
    "gqeberha": "Nelson Mandela Bay",
    "uitenhage": "Nelson Mandela Bay",
    "bloemfontein": "Mangaung",
    "kimberley": "Sol Plaatjie",
    "upington": "Dawid Kruiper",
    "polokwane": "Polokwane",
    "tzaneen": "Greater Tzaneen",
    "thohoyandou": "Thulamela",
    "nelspruit": "Mbombela",
    "whiteriver": "Mbombela",
    "mbombela": "Mbombela",
    "witbank": "Emalahleni",
    "emalahleni": "Emalahleni",
    "middelburg": "Steve Tshwete",
    "secunda": "Govan Mbeki",
    "ermelo": "Msukaligwa",
    "standerton": "Lekwa",
    "suncity": "Moses Kotane",
    "rustenburg": "Rustenburg",
    "potchefstroom": "Ventersdorp/Tlokwe",
    "klerksdorp": "City of Matlosana",
    "mahikeng": "Mafikeng",
    "mafikeng": "Mafikeng",
    "ladysmith": "Alfred Duma",
    "newcastle": "Newcastle",
    "richardsbay": "uMhlathuze",
    "vanderbijlpark": "Emfuleni",
    "vereeniging": "Emfuleni",
    "krugersdorp": "Mogale City",
    "paarl": "Drakenstein",
    "franschhoek": "Drakenstein",
    "wellington": "Drakenstein",
    "stellenbosch": "Stellenbosch",
    "somersetwest": "City of Cape Town",
    "hermanus": "Overstrand",
    "worcester": "Breede Valley",
    "george": "George",
    "knysna": "Knysna",
    "mosselbay": "Mossel Bay",
    "oudtshoorn": "Oudtshoorn",
}


def za_province(gaz: Gazetteer, hierarchy: list) -> str:
    for part in hierarchy:
        key = norm(part)
        code = gaz.district_code(part)
        if code:
            return code
        alias = ZA_PROVINCE_ALIAS.get(key)
        if alias:
            return gaz.district_code(alias)
    return ""


def za_town(gaz: Gazetteer, province: str, hierarchy: list, address: str) -> str:
    """Pin a scrape hierarchy to a gazetteer town inside `province`."""
    hints = []
    for part in hierarchy:
        hints.extend(split_hints(part))
    hints.extend([clean_text(line) for line in str(address or "").split("\n") if clean_text(line)])
    hints.reverse()                                  # deepest place first

    town = gaz.match_in_district(province, hints)
    if town:
        return town
    for hint in hints:
        hit = gaz.area_by_key.get(norm(hint))
        if hit and hit[0] == province:
            return hit[2]
    named = {norm(t): t for t in gaz.towns_of(province)}
    for hint in hints:
        target = ZA_TOWN_ALIAS.get(norm(hint))
        if target and norm(target) in named:
            return named[norm(target)]
    return ""


def za_menu(item, budget_state) -> list:
    """details.json menu -> [{category, name, price|variants, description}]."""
    out = []
    for menu in item.get("menu") or []:
        menu_name = clean_text(menu.get("name"))
        for section in menu.get("sections") or []:
            category = clean_text(section.get("name")) or menu_name or "Menu"
            for entry in section.get("items") or []:
                name = clean_text(entry.get("name"))
                if not name or SIZE_ROW_RE.match(name):
                    continue
                row_item = {"category": category, "name": name}
                description = shorten(entry.get("description"), 320)
                if description:
                    row_item["description"] = description
                variants = []
                for portion in entry.get("portions") or []:
                    price = parse_amount(portion.get("price"))
                    label = clean_text(portion.get("label")) or "Option"
                    if price is None:
                        continue
                    variants.append({"name": shorten(label, 60), "price": price})
                if variants:
                    row_item["variants"] = variants
                else:
                    price = parse_amount(entry.get("price"))
                    if price is not None:
                        row_item["price"] = price
                if "price" not in row_item and "variants" not in row_item:
                    continue            # nothing to order and nothing to read
                out.append(row_item)
                budget_state["bytes"] += len(json.dumps(row_item, ensure_ascii=False))
    return out


def build_south_africa() -> str:
    spec = SPEC_ZA
    gaz = Gazetteer(ROOT / "assets" / "South Africa" / "South_Africa_Locations.js")
    root = ROOT / "assets" / "South Africa"

    prepared = []
    used = set()
    resolved = 0
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        details = folder / "details.json"
        if not details.exists():
            continue
        item = read_json(details)
        name = clean_text(item.get("name"))
        if not name:
            continue
        # the folder name is `<member_id>_<slug>` and is unique by construction
        slug = unique_slug(folder.name.split("_", 1)[-1], used)
        hierarchy = [clean_text(x) for x in (item.get("location_hierarchy") or []) if clean_text(x)]
        province = za_province(gaz, hierarchy)
        town = za_town(gaz, province, hierarchy, item.get("address")) if province else ""
        if town:
            resolved += 1
        prepared.append((slug, name, province, town, hierarchy, item))

    # Menus: most complete first, until the payload budget is spent.
    menu_candidates = []
    for slug, _name, _province, _town, _hierarchy, item in prepared:
        rows = za_menu(item, {"bytes": 0})
        if rows:
            priced = sum(1 for r in rows if "price" in r or "variants" in r)
            menu_candidates.append((priced, len(rows), slug, rows))
    menu_candidates.sort(key=lambda entry: (entry[0], entry[1]), reverse=True)

    menu_files, menus_raw = {}, {}
    spent = 0
    for priced, _count, slug, rows in menu_candidates:
        size = len(json.dumps(rows, ensure_ascii=False))
        if spent + size > MENU_BUDGET_BYTES:
            continue
        menus_raw[slug] = {"menu": rows}
        menu_files[slug] = "inline"
        spent += size

    restaurants = []
    for slug, name, province, town, hierarchy, item in prepared:
        address = "\n".join(
            line for line in str(item.get("address") or "").split("\n") if clean_text(line)
        )
        addresses = [clean_text(line) for line in address.split("\n") if clean_text(line)][:MAX_ADDRESSES]
        areas = []
        for area in hierarchy[2:]:
            push_unique(areas, area)
            if len(areas) >= MAX_AREAS:
                break
        contacts = []
        for label, key in (("Reservations", "booking_number"), ("Phone", "call_number")):
            value = clean_text(item.get(key))
            if value and not any(c["value"] == value for c in contacts):
                contacts.append({"label": label, "value": value})
        cuisines = [clean_text(c) for c in (item.get("cuisines") or []) if clean_text(c)]
        website = clean_text(item.get("website"))
        if website and not website.lower().startswith("http"):
            website = ""
        if not website:
            website = clean_text(item.get("url"))

        description = shorten(item.get("description"))
        if not description:
            # 288 scrapes carry no prose; the cuisine + address line is the About copy
            description = shorten(", ".join(filter(None, [
                " · ".join(cuisines[:2]),
                addresses[0] if addresses else "",
                clean_text(item.get("price_range")),
            ])))

        restaurants.append(row(
            spec, slug, name, province, gaz.district_name(province), town,
            areas=areas,
            addresses=addresses,
            contacts=contacts,
            description=description,
            website=website,
            types=cuisines[:3],
            category=cuisines[0] if cuisines else "",
        ))

    report = write_payload(spec, restaurants, menu_files, menus_raw, {})
    return report + " | towns resolved %d/%d, %d venues had a menu" % (
        resolved, len(restaurants), len(menu_candidates),
    )


def main() -> None:
    for line in (build_kenya(), build_mauritius(), build_south_africa()):
        print(line)


if __name__ == "__main__":
    main()




