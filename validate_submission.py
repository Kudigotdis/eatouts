#!/usr/bin/env python3
"""Validate one venue submission file against eatouts.venue.v1."""
import json, sys

SCHEMA = 'eatouts.venue.v1'
REQUIRED = ['$schema', 'slug', 'name', 'location', 'contacts']


def main(path):
    with open(path, 'r', encoding='utf-8') as f:
        sub = json.load(f)

    errors, warnings = [], []

    for k in REQUIRED:
        if k not in sub:
            errors.append(f'missing required key: {k}')
    if sub.get('$schema') != SCHEMA:
        errors.append(f'wrong schema: {sub.get("$schema")!r} (expected {SCHEMA!r})')
    if not sub.get('slug'):
        errors.append('slug is empty')
    if not sub.get('name'):
        errors.append('name is empty')

    loc = sub.get('location') or {}
    if not loc.get('town'):
        errors.append('location.town is empty')
    if not loc.get('district'):
        warnings.append('location.district is empty')

    contacts = sub.get('contacts') or []
    if not contacts:
        errors.append('contacts[] is empty — add at least one number')
    else:
        if not any(c.get('primary') for c in contacts):
            warnings.append('no contact marked primary')
        if not any(c.get('whatsapp') for c in contacts):
            warnings.append('no contact marked whatsapp — orders will not route')

    if not sub.get('types'):
        warnings.append('types[] is empty')

    content = sub.get('content') or {}
    if not content.get('menuCategories'):
        warnings.append('no menu categories — venue will show an empty menu')

    if errors:
        print(f'FAIL {path}')
        for e in errors:
            print(f'  x {e}')
        for w in warnings:
            print(f'  ! {w}')
        return 1

    print(f'OK   {path}  ({sub["slug"]})')
    for w in warnings:
        print(f'  ! {w}')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('usage: validate_submission.py <file.json>')
        sys.exit(2)
    sys.exit(main(sys.argv[1]))