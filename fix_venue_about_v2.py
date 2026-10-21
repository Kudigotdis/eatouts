import re, shutil, time, sys, os

path = r'venue-about.html'
if not os.path.exists(path):
    print('ERROR: venue-about.html not found in', os.getcwd()); sys.exit(1)

with open(path, 'r', encoding='utf-8-sig') as f:
    html = f.read()

if '__VENUE_ABOUT_V2__' in html:
    print('Already patched - nothing to do.'); sys.exit(0)

bak = path + '.bak.' + time.strftime('%Y%m%d-%H%M%S')
shutil.copy(path, bak)
print('Backup:', bak)

# 1. Script tags for data sources
if 'directory_runtime_data.js' not in html:
    html = html.replace('</head>',
        '\n<script src="js/eatouts-brand.js"></script>'
        '\n<script src="assets/data/restaurant_listings/directory_runtime_data.js"></script>'
        '\n<script src="assets/data/BottleLliquorStoresDatabase.js"></script>'
        '\n<script src="js/eatouts-bottle-stores.js"></script>'
        '\n<script src="assets/data/CateringServicesDatabase.js"></script>'
        '\n<script src="js/eatouts-catering.js"></script>'
        '\n</head>', 1)

# 2. Title
html = re.sub(r'<title>[^<]*</title>', '<title>EatOuts - Venue</title>', html, count=1)

# 3. Header (index.html style)
new_header = '<header id="hdr" style="display:flex;align-items:center;gap:10px;padding:14px 18px 6px;position:sticky;top:0;z-index:20;background:var(--brand-bg)">\n    <button class="brand-mark" type="button" aria-label="EatOuts home" onclick="window.location.href=\'index.html\'" style="background:none;border:0;padding:0;cursor:pointer;display:flex;align-items:center">\n      <img src="assets/logo/EatOuts_Logo.png" alt="EatOuts" style="height:34px;width:auto;display:block">\n    </button>\n    <div style="margin-left:auto"></div>\n  </header>'
html = re.sub(r'<header class="appbar">[\s\S]*?</header>', new_header, html, count=1)

# 4. Logo img
html = re.sub(r'(<img id="logoImg")[^>]*>', r'\1 alt="" src="" style="opacity:0">', html, count=1)

# 5. H1
html = re.sub(r'<h1>[^<]*</h1>', '<h1 id="venueName"></h1>', html, count=1)

# 6. Status line (delivery text removed)
html = re.sub(r'<p class="status-line"[^>]*>[\s\S]*?</p>',
              '<p class="status-line" id="statusLine" aria-live="polite"></p>', html, count=1)

# 7. Empty social row
html = re.sub(r'<div class="social-row"[^>]*>[\s\S]*?</div>\s*</div>\s*<!-- PAD -->',
              '<div class="social-row" id="socialRow" aria-label="Contact channels"></div>\n    </div>\n\n    <!-- PAD -->',
              html, count=1)

# 8. Empty options list
html = re.sub(r'<div class="opt-list">[\s\S]*?</div>',
              '<div class="opt-list" id="optList"></div>', html, count=1)

# 9. Tabbar (navigates back to index.html)
new_nav = '<nav class="tabbar" aria-label="Primary">\n    <button class="tab" aria-label="Promos" onclick="window.location.href=\'index.html#promos\'"><svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></button>\n    <button class="tab" aria-label="Restaurants" onclick="window.location.href=\'index.html#restaurants\'"><svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"/><path d="M3 9h18"/><path d="M9 13h6"/></svg></button>\n    <button class="tab" aria-label="Reserve" onclick="window.location.href=\'index.html#reserve\'"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>\n    <button class="tab" aria-label="Gallery" onclick="window.location.href=\'index.html#gallery\'"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>\n    <button class="tab on" aria-label="About" onclick="window.location.href=\'index.html#about\'"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>\n  </nav>'
html = re.sub(r'<nav class="tabbar"[^>]*>[\s\S]*?</nav>', new_nav, html, count=1)

# 10. Replace the whole IIFE with the new one
with open('venue-about-v2-script.txt', 'r', encoding='utf-8') as f:
    new_script = f.read()

pat = re.compile(r'<script>\s*\(function\s*\(\s*\)\s*\{[\s\S]*?\}\)\(\);\s*</script>')
matches = list(pat.finditer(html))
if matches:
    last = matches[-1]
    html = html[:last.start()] + new_script + html[last.end():]
    print('Replaced IIFE script block')
else:
    print('WARNING: IIFE script block not found - UI changes applied but JS not replaced')

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print('DONE: venue-about.html updated.')
