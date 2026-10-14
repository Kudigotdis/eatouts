const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

function inline(html) {
  const errors = [];
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  return { html, errors };
}

function boot(draft) {
  const { html, errors } = inline(fs.readFileSync(path.join(APP_DIR, 'eatout_event_builder.html'), 'utf8'));
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1/eatout_event_builder.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      if (draft) w.localStorage.setItem('eatouts.event.draft.v2', JSON.stringify(draft));
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

function click(w, el) {
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
}
function type(w, inp, val) {
  inp.value = val;
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
}

function draftWith(venueId, opt) {
  opt = opt || {};
  return {
    eventTitle: 'Gallery Gala',
    venueId: venueId,
    eventType: { eventId: 'wedding_ceremony', name: 'Wedding Ceremony', categoryId: 'weddings_cultural', categoryName: 'Weddings & Cultural Traditions', subCategoryName: 'Ceremony & Weekend', description: '', icon: '💍' },
    schedule: { mode: 'one-day', days: [{ startDate: '2026-11-07', startTime: '09:00', endDate: '2026-11-07', endTime: '17:00' }] },
    suppliers: opt.suppliers || { event_planning: [{ supplierId: 'demo_supplier_001', customisations: { qty: '1', addon_0: '1' } }] },
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], contacts: [], budget: '1' },
    guests: [], rsvp: [], notes: [], flyerImages: opt.images || [], venueSpaces: [], venueRules: [],
    targetAudience: []
  };
}

(async () => {
  const probe = boot(null);
  check('builder boot: external scripts present', !probe.errors.some(e => e.indexOf('missing script') === 0), probe.errors.filter(e => e.indexOf('missing script') === 0).join(' | '));
  const venueId = (probe.w.getVenues()[0] || {}).id;
  check('probe exposes venue list', !!venueId, 'no venues');
  if (!venueId) { console.log('PREVIEW TEST FAILED (no venue)'); process.exit(fails ? 1 : 0); }

  const a = boot(draftWith(venueId, {
    images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB', 'data:image/png;base64,CCCC']
  }));
  const w = a.w, doc = a.doc;
  check('main boot: no window errors', !a.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), a.errors.join(' | '));

  /* ---------- Main-scroll footer: heart · Save · WhatsApp on one row ---------- */
  const mf = doc.querySelector('#mainScroll .ev-foot-row');
  check('main scroll footer is the ev-foot-row', !!mf);
  check('main scroll footer has heart + Save + WhatsApp (3 children)',
    !!mf && mf.children.length === 3, mf ? mf.children.length : 'none');
  check('main scroll footer heart on the left',
    !!mf && mf.firstElementChild.getAttribute('data-act') === 'favEvent' &&
    /heart_(active|inactive)_icon/.test(mf.firstElementChild.querySelector('img').getAttribute('src')));
  check('main scroll footer Save Event in the middle',
    !!mf && mf.children[1].getAttribute('data-act') === 'saveEvent' && /Save Event/.test(mf.children[1].textContent));
  check('main scroll footer WhatsApp on the right',
    !!mf && mf.lastElementChild.getAttribute('data-act') === 'shareWhatsApp' &&
    /whatsApp_icon_on/.test(mf.lastElementChild.querySelector('img').getAttribute('src')));
  check('main scroll footer has two bare icon buttons',
    !!mf && mf.querySelectorAll('.ico-btn').length === 2);

  /* ---------- Preview section is header-only ---------- */
  const sec = doc.querySelector('[data-sec="preview"]');
  check('preview section exists', !!sec);
  check('preview section starts closed', sec && !sec.classList.contains('open'));
  check('preview body is empty (no warnings/inline page/toggles)',
    !doc.querySelector('[data-sec="preview"] .warning') &&
    !doc.querySelector('[data-sec="preview"] .preview-page') &&
    !doc.querySelector('[data-sec="preview"] .preview-vis'));

  /* ---------- Header tap opens the full preview page, no accordion toggle ---------- */
  click(w, doc.querySelector('[data-sec="preview"] .section-hdr'));
  check('header tap opens the preview page', !!doc.querySelector('.preview-pg'));
  check('preview accordion stays closed', !sec.classList.contains('open'));

  /* ---------- Hero becomes an uncropped gallery carousel ---------- */
  const slides = doc.querySelectorAll('.preview-hero-track .preview-hero-slide');
  check('hero renders one slide per image (3)', slides.length === 3, 'got ' + slides.length);
  const dots = doc.querySelectorAll('.preview-hero-dot');
  check('gallery shows a dot per image (3)', dots.length === 3, 'got ' + dots.length);
  check('old overlay is gone', !doc.querySelector('.preview-hero-overlay'));
  click(w, dots[1]);
  check('dot tap highlights the matching page index',
    doc.querySelector('.preview-hero-dot.on') === dots[1] && !dots[0].classList.contains('on'));

  /* ---------- Warnings relocated into the preview page ---------- */
  check('budget warning appears at top of preview body', !!doc.querySelector('.preview-body .warning.budget'));

  /* ---------- Preview Visibility is a closed accordion below the hero ---------- */
  const vis = doc.querySelector('.preview-vis');
  check('preview visibility accordion present in preview page', !!vis);
  check('preview visibility closed by default', vis && !vis.classList.contains('open'));
  click(w, doc.querySelector('.preview-vis-hdr'));
  check('accordion opens on header tap', vis.classList.contains('open'));
  check('visibility rows are inside the accordion', doc.querySelectorAll('.preview-vis .privacy-row').length === 5);

  /* ---------- A visibility switch hides its card; accordion stays open ---------- */
  const supSwitch = doc.querySelector('.preview-vis .switch[data-key="showSuppliers"]');
  check('suppliers switch starts on', supSwitch && supSwitch.classList.contains('on'));
  const hadSuppliersCard = [].some.call(doc.querySelectorAll('.preview-body .preview-card h3'), h3 => /suppliers/i.test(h3.textContent));
  check('suppliers card visible before toggle', hadSuppliersCard);
  click(w, supSwitch);
  const hasSuppliersCardAfter = [].some.call(doc.querySelectorAll('.preview-body .preview-card h3'), h3 => /suppliers/i.test(h3.textContent));
  check('suppliers card hidden after toggle', !hasSuppliersCardAfter);
  check('accordion stays open after re-render', doc.querySelector('.preview-vis').classList.contains('open'));

  /* ---------- Footer scrolls with the page content ---------- */
  check('share footer lives inside the scroll region', !!doc.querySelector('.preview-pg-scroll .preview-pg-foot'));
  check('footer keeps its three text buttons', doc.querySelectorAll('.preview-pg-foot .btn').length === 3);
  check('footer offers Save Event', !!doc.querySelector('.preview-pg-foot [data-act="saveEvent"]'));
  check('footer offers a bare WhatsApp icon', !!doc.querySelector('.preview-pg-foot [data-act="shareWhatsApp"] img'));
  check('footer offers a bare Save icon', !!doc.querySelector('.preview-pg-foot [data-act="favEvent"] img'));
  check('footer offers Promote Event', /Promote Event/.test((doc.querySelector('.preview-pg-foot [data-act="postOnPromos"]') || {}).textContent || ''));

  // close
  click(w, doc.querySelector('[data-act="closePreview"]'));
  check('preview page closes', !doc.querySelector('.preview-pg'));

  /* ---------- No-image fallback hero ---------- */
  const b = boot(draftWith(venueId));
  const dw = b.w, ddoc = b.doc;
  check('no-image boot: no window errors', !b.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), b.errors.join(' | '));
  click(dw, ddoc.querySelector('[data-sec="preview"] .section-hdr'));
  check('no-image fallback hero renders', !!ddoc.querySelector('.preview-hero-ph'));
  check('no-image hero has no gallery track', !ddoc.querySelector('.preview-hero-track'));

  console.log('\nBUILDER-PREVIEW TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });