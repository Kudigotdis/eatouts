/* ============================================================
   EATOUTS BRAND
   Logos + restaurant thumbnail tiles.

   Platform logo  assets/logo/EatOuts_Logo.png        477x107 transparent
   Soya logo      assets/logo/soya_cafe_logo.jpg     1131x1131 square
   TYG logo       assets/logo/yellow_giraffe_logo.jpg 1172x504 wide

Rule: Soya and The Yellow Giraffe use their real logos. Every
   other restaurant gets a letter tile — first letter of the name on
   a 7-colour rotation, deterministic from the slug so it never
   reshuffles between loads.

   Letter colour is #1A1A1A (black) on every swatch, per design. That
   is a deliberate contrast trade-off: black on the mid/dark swatches
   (blue #2C6288, red #C43C3C, green #2E7D32) lands around 2.4-4.5:1,
   below WCAG AA. Switch thumbHtml() back to sw.fg for white letters
   if that ever matters more than the requested look.
   ============================================================ */
(function () {
  'use strict';

  var LOGOS = {
    platform: 'assets/logo/EatOuts_Logo.png',
    soya: 'assets/logo/soya_cafe_logo.jpg',
    tyg: 'assets/logo/yellow_giraffe_logo.jpg'
  };

  /* Restaurants with a real logo file, keyed by slug. */
  var REAL_LOGOS = {
    soya: LOGOS.soya,
    'the-yellow-giraffe': LOGOS.tyg
  };

  /* Order matters - this is the rotation order. Slot 1 was the old gold swatch;
     repointed to violet for the all-black UI. Slots are position-stable, so
     each restaurant keeps the same swatch it had before. */
  var PALETTE = [
    { name: 'red',       bg: '#C43C3C', fg: '#FFFFFF' },
    { name: 'violet',    bg: '#6B4E9B', fg: '#FFFFFF' },
    { name: 'blue',      bg: '#2C6288', fg: '#FFFFFF' },
    { name: 'green',     bg: '#2E7D32', fg: '#FFFFFF' },
    { name: 'lime',      bg: '#7CB518', fg: '#1A1A1A' },
    { name: 'baby blue', bg: '#7EC8E3', fg: '#1A1A1A' },
    { name: 'light red', bg: '#F2A0A0', fg: '#1A1A1A' }
  ];

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hash(s) {
    var h = 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /** Lowercase, hyphenated, ASCII-ish slug. */
  function slugify(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   /* strip accents: Café -> cafe */
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Which swatch a restaurant gets. Stable across reloads. */
  function swatchFor(slug) {
    return PALETTE[hash(slug || 'eatouts') % PALETTE.length];
  }

  /**
   * The letter shown on a tile.
   * Strips leading articles/prefixes so "The Courtyard" reads "C",
   * not a lonely "T".
   */
  function initialFor(name) {
    var n = String(name || '').trim();
    var m = n.match(/^(?:the|a|an)\s+(.+)$/i);
    if (m) n = m[1].trim();
    n = n.replace(/[^A-Za-z0-9].*$/, '');   /* first token only */
    return (n.charAt(0) || 'E').toUpperCase();
  }

  function hasRealLogo(slug) {
    return Object.prototype.hasOwnProperty.call(REAL_LOGOS, slug);
  }

  /** Logo URL for a restaurant, or null when it should use a tile. */
  function logoFor(restaurant) {
    if (!restaurant) return null;
    var slug = restaurant.slug || slugify(restaurant.name);
    if (restaurant.logo) return restaurant.logo;
    if (hasRealLogo(slug)) return REAL_LOGOS[slug];
    return null;
  }

  /**
   * Square thumbnail markup for a restaurant.
   * Real logo if one exists, otherwise a letter tile.
   */
  function thumbHtml(restaurant, opts) {
    opts = opts || {};
    var name = (restaurant && restaurant.name) || 'Eatouts';
    var slug = (restaurant && restaurant.slug) || slugify(name);
    var alt = opts.alt || name;
    var cls = opts.className ? ' ' + opts.className : '';

    var logo = logoFor(restaurant);
    if (logo) {
      return '<span class="eo-thumb eo-thumb-img' + cls + '">' +
        '<img src="' + esc(logo) + '" alt="' + esc(alt) + '">' +
        '</span>';
    }

    var sw = swatchFor(slug);
    var letter = initialFor(name);
    return '<span class="eo-thumb eo-thumb-tile' + cls + '"' +
      ' style="background:' + sw.bg + ';color:#1A1A1A"' +
      ' title="' + esc(name) + '">' +
      '<span class="eo-thumb-letter">' + esc(letter) + '</span>' +
      '</span>';
  }

  /**
   * Plain data version, for when you need the colour rather than
   * the markup (e.g. a coloured dot in a list row).
   */
  function thumbInfo(restaurant) {
    var name = (restaurant && restaurant.name) || 'Eatouts';
    var slug = (restaurant && restaurant.slug) || slugify(name);
    var sw = swatchFor(slug);
    return {
      logo: logoFor(restaurant),
      isTile: !logoFor(restaurant),
      swatch: sw.name,
      bg: sw.bg,
      fg: sw.fg,
      letter: initialFor(name)
    };
  }

  /**
   * Thumbnail styles. These used to be defined here and never injected,
   * so every .eo-thumb rendered as an unstyled inline span that shrank to
   * hug its letter instead of filling the square. Injected automatically
   * now; still exported as CSS for anyone who prefers to paste it.
   */
  var CSS = [
    '.eo-thumb{display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;',
    '  width:56px;height:56px;border-radius:14px;border:1px solid #ece7db;box-sizing:border-box}',
    '.eo-thumb-img{background:#ffffff}',
    '.eo-thumb-img img{width:100%;height:100%;object-fit:cover;display:block}',
    '.eo-thumb-tile{box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}',
    '.eo-thumb-letter{font-size:25px;font-weight:900;line-height:1;letter-spacing:-.02em;color:#1A1A1A}',
    '.eo-thumb-sm{width:40px;height:40px;border-radius:11px}',
    '.eo-thumb-sm .eo-thumb-letter{font-size:18px}',
    '.eo-thumb-lg{width:80px;height:80px;border-radius:18px}',
    '.eo-thumb-lg .eo-thumb-letter{font-size:34px}'
  ].join('');

  /** Idempotent: safe to call from every page that loads this file. */
  function injectCss() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('eatouts-brand-css')) return;
    var st = document.createElement('style');
    st.id = 'eatouts-brand-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  injectCss();

  window.EatoutsBrand = {
    LOGOS: LOGOS,
    REAL_LOGOS: REAL_LOGOS,
    PALETTE: PALETTE,
    CSS: CSS,
    slugify: slugify,
    hash: hash,
    swatchFor: swatchFor,
    initialFor: initialFor,
    hasRealLogo: hasRealLogo,
    logoFor: logoFor,
    thumbHtml: thumbHtml,
    thumbInfo: thumbInfo,
    esc: esc
  };
})();