#!/usr/bin/env python3
"""Seed owner_submissions/*.json from a raw listings export.

Usage:
    python scripts/seed_from_listings.py <input.json> [output_dir] [--force]

The input may be a JSON list, or an object holding one of the keys
"items", "listings", or "restaurants". Every record is converted to
the eatouts.venue.v1 submission shape that intake.html exports and
merge_submissions.py ingests (integration_file.txt section 6.4).

Output files are named venue_<slug>_<YYYYMMDD>.json (UTC date) so
merge_submissions.py's `venue_*.json` glob picks them up.

Contacts are emitted with both the intake-style keys
(title/countryCode/number/purpose/whatsapp/primary/active) and the
runtime-style keys (label/value), so merge_submissions.py produces a
correct runtime record without further mapping.

Exit codes: 0 on success, 2 on bad arguments.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import unicodedata


def text(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def slugify(value):
    value = unicodedata.normalize("NFKD", text(value)).encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def first(record, keys):
    for key in keys:
        if key not in record:
            continue
        value = record.get(key)
        if isinstance(value, (list, tuple)):
            if value:
                return value[0]
            continue
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return ""


def split_phone(raw):
    """Return (countryCode, number) with a leading + on the code."""
    value = text(raw)
    if not value:
        return "", ""
    digits = re.sub(r"[^\d+]", "", value)
    if not digits:
        return "", value
    if digits.startswith("00"):
        return split_phone("+" + digits[2:])
    if digits.startswith("+"):
        m = re.match(r"^\+(\d{1,4})(.*)$", digits)
        if m:
            return "+" + m.group(1), m.group(2).lstrip("0") or m.group(2)
        return digits, ""
    if len(digits) >= 8 and digits.startswith("267"):
        return "+267", digits[3:]
    return "+267", digits


def make_contact(raw, label, primary, whatsapp):
    if isinstance(raw, dict):
        cc = text(raw.get("countryCode") or raw.get("country_code") or "")
        num = text(raw.get("number") or raw.get("value") or raw.get("phone") or raw.get("tel"))
        if not cc and num:
            cc, num = split_phone(num)
        elif cc and num.startswith(cc):
            num = num[len(cc):].strip()
        if not num:
            return None
        cc = cc or "+267"
        is_wa = bool(raw.get("whatsapp")) or whatsapp
        is_primary = bool(raw.get("primary")) or primary
        label_out = text(raw.get("label") or raw.get("title") or label)
        label_out = label_out or ("WhatsApp" if is_wa else "Phone")
        value = (cc + " " + num).strip()
        return {
            "title": label_out,
            "label": label_out,
            "purpose": label_out,
            "countryCode": cc,
            "number": num,
            "value": value,
            "whatsapp": is_wa,
            "primary": is_primary,
            "active": True,
        }

    cc, num = split_phone(raw)
    if not num:
        return None
    cc = cc or "+267"
    label_out = label or ("WhatsApp" if whatsapp else "Phone")
    value = (cc + " " + num).strip()
    return {
        "title": label_out,
        "label": label_out,
        "purpose": label_out,
        "countryCode": cc,
        "number": num,
        "value": value,
        "whatsapp": whatsapp,
        "primary": primary,
        "active": True,
    }


def collect_contacts(record):
    out = []
    raw_contacts = record.get("contacts")
    if isinstance(raw_contacts, list) and raw_contacts:
        for i, item in enumerate(raw_contacts):
            c = make_contact(item, "WhatsApp" if i == 0 else "Phone", i == 0, i == 0)
            if c:
                out.append(c)
    if out:
        return out

    wa = first(record, ["whatsapp", "mobile_phone_whatsapp", "whatsApp", "wa", "mobile"])
    phone = first(record, ["phone", "tel", "telephone", "contact_number_call",
                           "contact", "call", "landline"])
    if wa:
        c = make_contact(wa, "WhatsApp", True, True)
        if c:
            out.append(c)
    if phone:
        c = make_contact(phone, "Phone", not out, False)
        if c:
            out.append(c)
    return out


def collect_types(record):
    raw = record.get("types") or record.get("type") or record.get("category")
    if isinstance(raw, str):
        return [t.strip() for t in re.split(r"[,/|]", raw) if t.strip()]
    if isinstance(raw, list):
        return [text(t) for t in raw if text(t)]
    return []


def to_submission(record):
    if not isinstance(record, dict):
        return None
    name = text(first(record, ["name", "title", "business_name", "restaurant", "venue"]))
    if not name:
        return None

    slug = text(first(record, ["slug"])) or slugify(name)
    if not slug:
        return None

    location = record.get("location") if isinstance(record.get("location"), dict) else {}
    district = text(first(record, ["district", "districtName"]) or location.get("district"))
    town = text(first(record, ["town", "city", "town_city", "townCity"]) or location.get("town"))
    area = text(first(record, ["area", "area_neighbourhood", "neighbourhood", "suburb"])
                or location.get("area"))
    landmark = text(first(record, ["landmark", "address"]) or location.get("landmark"))

    identity = record.get("identity") if isinstance(record.get("identity"), dict) else {}
    logo = text(first(record, ["logo"]) or identity.get("logo"))
    cover = text(first(record, ["coverImage", "cover", "image"]) or identity.get("coverImage"))

    return {
        "$schema": "eatouts.venue.v1",
        "slug": slug,
        "name": name,
        "description": text(first(record, ["description", "company_description",
                                            "blurb", "about"])),
        "contacts": collect_contacts(record),
        "location": {
            "district": district,
            "districtName": district or "",
            "town": town,
            "area": area,
            "landmark": landmark,
        },
        "identity": {
            "logo": logo,
            "coverImage": cover,
            "types": collect_types(record),
        },
        "hours": {},
        "menu": {"categories": []},
        "promos": [],
        "events": [],
        "gallery": {"groups": []},
        "source": "seed",
        "createdAt": int(time.time() * 1000),
    }


def load_records(path):
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("items", "listings", "restaurants"):
            value = data.get(key)
            if isinstance(value, list):
                return value
    raise SystemExit(f"Could not find a list of records in {path}")


def main(argv):
    positional = [a for a in argv if not a.startswith("--")]
    flags = set(a for a in argv if a.startswith("--"))
    if not positional:
        print("usage: seed_from_listings.py <input.json> [output_dir] [--force]",
              file=sys.stderr)
        return 2

    src = positional[0]
    out_dir = positional[1] if len(positional) > 1 else "owner_submissions"
    force = "--force" in flags

    if not os.path.isfile(src):
        print(f"input not found: {src}", file=sys.stderr)
        return 2

    records = load_records(src)
    os.makedirs(out_dir, exist_ok=True)

    # UTC date suffix so merge_submissions.py's `venue_*.json` glob
    # matches the files this script writes.
    date_suffix = time.strftime("%Y%m%d", time.gmtime())

    written = skipped = 0
    for record in records:
        sub = to_submission(record)
        if not sub:
            skipped += 1
            continue
        target = os.path.join(out_dir, f"venue_{sub['slug']}_{date_suffix}.json")
        if os.path.exists(target) and os.path.getsize(target) > 0 and not force:
            print(f"SKIP  {target} (exists; pass --force to overwrite)")
            skipped += 1
            continue
        with open(target, "w", encoding="utf-8") as fh:
            json.dump(sub, fh, indent=2, ensure_ascii=False)
        print(f"WROTE {target}")
        written += 1

    print(f"\nDone. written={written} skipped={skipped} total={len(records)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))