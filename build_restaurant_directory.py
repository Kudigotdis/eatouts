#!/usr/bin/env python3
"""
Merge owner_submissions/venue_*.json into directory_runtime_data.json.

Input:  owner_submissions/venue_<slug>_<YYYYMMDD>.json  (eatouts.venue.v1)
Output: assets/data/restaurant_listings/directory_runtime_data.json

Runtime shape (from your actual file):
  top-level: generatedAt, restaurants[], seedRows[], menuFiles{}, menuImages{}, menusRaw{}
  record:    {name, slug, town, district, districtName, areas[], addresses[],
              contacts:[{label,value}], socials:[{platform,url}], description,
              website, logo, types[], category, sources[], id, area, landmark}
"""
import json, glob, os, sys, re
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNTIME = os.path.join(ROOT, 'assets/data/restaurant_listings/directory_runtime_data.json')
SUBMISSIONS = os.path.join(ROOT, 'owner_submissions')
SCHEMA = 'eatouts.venue.v1'


def contacts_to_runtime(contacts):
    """intake: [{title, countryCode, number, purpose, primary, whatsapp, active}]
       runtime: [{label, value}]"""
    out = []
    for c in contacts or []:
        if c.get('active') is False:
            continue
        cc = (c.get('countryCode') or '+267').strip()
        num = (c.get('number') or '').strip()
        if not num:
            continue
        label = 'WhatsApp' if c.get('whatsapp') else (c.get('purpose') or c.get('title') or 'Phone')
        out.append({'label': label, 'value': f'{cc} {num}'.strip()})
    return out


def socials_to_runtime(socials):
    """intake: {instagram:'handle', facebook:'url', website:'...', ...}
       runtime: [{platform, url}]"""
    if isinstance(socials, list):
        return socials  # already runtime shape
    out = []
    for platform, url in (socials or {}).items():
        if not url:
            continue
        out.append({'platform': platform.capitalize(), 'url': str(url)})
    return out


def socials_get(socials, platform):
    for s in socials or []:
        if s.get('platform') == platform:
            return s.get('url')
    return None


def menu_to_runtime(content):
    """Build a menusRaw entry from content.menuCategories + content.menuItems."""
    cats = content.get('menuCategories') or []
    items = content.get('menuItems') or []
    if not cats:
        return None
    by_cat = {}
    for it in items:
        by_cat.setdefault(it.get('categoryId'), []).append(it)
    menu = []
    for cat in cats:
        entry = {'category': cat.get('name') or 'Menu', 'items': []}
        for it in by_cat.get(cat.get('id'), []):
            item = {'name': it.get('name') or ''}
            price = it.get('basePrice')
            if price is not None:
                try:
                    item['price'] = float(price)
                except (TypeError, ValueError):
                    pass
            if it.get('description'):
                item['description'] = it['description']
            entry['items'].append(item)
        menu.append(entry)
    return menu


def build_restaurant_record(sub, existing=None):
    slug = sub['slug']
    loc = sub.get('location') or {}
    contacts = contacts_to_runtime(sub.get('contacts'))
    socials = socials_to_runtime(sub.get('socials'))
    types = sub.get('types') or []
    category = sub.get('category') or (types[0] if types else '')
    existing = existing or {}

    return {
        'name': sub.get('name') or '',
        'slug': slug,
        'town': loc.get('town') or '',
        'district': loc.get('district') or '',
        'districtName': loc.get('districtName') or '',
        'areas': [loc['area']] if loc.get('area') else [],
        'addresses': [],
        'contacts': contacts,
        'socials': socials,
        'description': sub.get('description') or '',
        'website': socials_get(socials, 'Website') or '',
        'logo': sub.get('logo') or '',
        'types': types,
        'category': category,
        'sources': sorted(set((existing.get('sources') or []) + ['owner_submissions'])),
        'id': f'rest_{slug}',
        'area': loc.get('area') or '',
        'landmark': loc.get('landmark') or '',
    }


def merge(runtime, sub):
    slug = sub['slug']
    restaurants = runtime.setdefault('restaurants', [])
    existing = next((r for r in restaurants if r.get('slug') == slug), None)
    record = build_restaurant_record(sub, existing)
    action = 'updated' if existing else 'added'
    if existing:
        existing.clear()
        existing.update(record)
    else:
        restaurants.append(record)

    content = sub.get('content') or {}
    menu = menu_to_runtime(content)
    if menu:
        runtime.setdefault('menusRaw', {})[slug] = {
            'restaurant': record['name'],
            'currency': 'BWP',
            'menu': menu,
        }

    # Keep the flat index (seedRows) in sync so the customer app's list view
    # sees the venue even if it doesn't read restaurants[] directly.
    seed = runtime.setdefault('seedRows', [])
    seed_entry = {
        'n': record['name'],
        'c': record['district'],
        't': record['town'],
        'a': record['area'],
        'm': '',
    }
    srow = next((s for s in seed if s.get('n') == record['name'] and s.get('t') == record['town']), None)
    if srow:
        srow.update(seed_entry)
    else:
        seed.append(seed_entry)

    return action


def validate(sub):
    if sub.get('$schema') != SCHEMA:
        return f"bad schema: {sub.get('$schema')}"
    if not sub.get('slug'):
        return 'missing slug'
    if not sub.get('name'):
        return 'missing name'
    if not (sub.get('location') or {}).get('town'):
        return 'missing location.town'
    return None


def main():
    if not os.path.exists(RUNTIME):
        print(f'ERROR: runtime data not found at {RUNTIME}', file=sys.stderr)
        return 2
    with open(RUNTIME, 'r', encoding='utf-8') as f:
        runtime = json.load(f)

    files = sorted(glob.glob(os.path.join(SUBMISSIONS, 'venue_*.json')))
    if not files:
        print('No submissions to merge.')
        return 0

    added = updated = errors = 0
    for path in files:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                sub = json.load(f)
            err = validate(sub)
            if err:
                print(f'SKIP {os.path.basename(path)}: {err}')
                errors += 1
                continue
            result = merge(runtime, sub)
            print(f'{result.upper():7} {sub["slug"]}')
            if result == 'added':
                added += 1
            else:
                updated += 1
        except Exception as e:
            print(f'ERROR {os.path.basename(path)}: {e}')
            errors += 1

    runtime['generatedAt'] = datetime.now(timezone.utc).isoformat()

    with open(RUNTIME, 'w', encoding='utf-8') as f:
        json.dump(runtime, f, indent=2, ensure_ascii=False)

    print(f'\nDone. added={added} updated={updated} errors={errors}')
    return 0 if errors == 0 else 1


if __name__ == '__main__':
    sys.exit(main())