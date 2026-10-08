const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
// inline every external script so jsdom runs the app with no HTTP server
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const EXPECT = {
  0: ['Kofifi Nights', 'Masa Poetry Nights'],
  1: ['AmaPiano Fest'],
  2: ['Kumnandi Ekhaya Music Fest 3.0'],
  3: ['Motse Wa Setso Cultural Festival (3rd Edition)'],
  4: ['Mas MusiQ Live'],
  5: ['Simply Piano (4th Edition)'],
  6: ['Social Link Music Festival']
};

const dom = new JSDOM(html, {
  url: 'http://localhost/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const doc = window.document;

const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  const feed = doc.getElementById('viewport');
  check('viewport rendered', !!feed && feed.innerHTML.length > 1000, feed ? feed.innerHTML.length + ' chars' : 'missing');

  const days = doc.querySelectorAll('[data-act="pickDay"]');
  check('7 calendar day buttons', days.length === 7, 'got ' + days.length);

  Object.keys(EXPECT).forEach(day => {
    const btn = doc.querySelector('[data-act="pickDay"][data-day="' + day + '"]');
    if (!btn) { fails++; console.log('FAIL  no day button for ' + day); return; }
    click(btn);
    const vp = doc.getElementById('viewport');
    const cards = vp.querySelectorAll('[data-acc^="fe_"]');
    const titles = Array.from(cards).map(c => (c.querySelector('.phead-btn h3') || {}).textContent || '?');
    check('day ' + day + ' featured cards', titles.length === EXPECT[day].length,
      'got [' + titles.join(' | ') + '] want [' + EXPECT[day].join(' | ') + ']');
    EXPECT[day].forEach((t, i) => check('  day ' + day + ' title ' + i, titles[i] === t, titles[i]));
    const img = cards[0] && cards[0].querySelector('.pimg img');
    check('  day ' + day + ' flyer src', !!img && /^assets\/images\/events\//.test(img.getAttribute('src')), img && img.getAttribute('src'));
  });

  // expand the Simply Piano card (Friday, day 5)
  click(doc.querySelector('[data-act="pickDay"][data-day="5"]'));
  let card = doc.querySelector('[data-acc="fe_simply-piano-4"]');
  check('simply piano card present', !!card);
  click(card.querySelector('.pimg'));
  check('card opens', card.classList.contains('open'));
  const body = card.querySelector('.acc-in');
  const txt = body.textContent;
  ['Lineup', 'Kamo Mphela', 'Tshego K', 'Sponsors & Partners', 'Sunbet.co.bw', 'Tickito (online)', 'Ticketing & Outlets', '#SimplyPiano']
    .forEach(s => check('  detail contains "' + s + '"', txt.indexOf(s) > -1));
  check('detail has waFeatEvent button', !!body.querySelector('[data-act="waFeatEvent"][data-ev="simply-piano-4"]'));

  // Sunday stack: Kofifi + Poetry, poetry keeps artists
  click(doc.querySelector('[data-act="pickDay"][data-day="0"]'));
  card = doc.querySelector('[data-acc="fe_POETRY-NIGHT-01"]');
  check('poetry card present on Sunday', !!card);
  click(card.querySelector('.pimg'));
  const ptxt = card.querySelector('.acc-in').textContent;
  const artistTotal = window.eval('DATA_ARTISTS.length');
  check('poetry artist lineup present', ptxt.indexOf('Artist Lineup') > -1 && ptxt.indexOf('of ' + artistTotal) > -1, 'total ' + artistTotal);
  check('poetry show-all button', !!card.querySelector('[data-act="togglePoetryAll"]'));
  check('poetry waPoetry button', !!card.querySelector('[data-act="waPoetry"]'));

  // poetry must NOT appear on other days
  [1, 2, 3, 4, 5, 6].forEach(d => {
    click(doc.querySelector('[data-act="pickDay"][data-day="' + d + '"]'));
    const n = doc.querySelectorAll('[data-acc="fe_POETRY-NIGHT-01"]').length;
    check('poetry absent on day ' + d, n === 0, 'count ' + n);
  });

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nSMOKE TEST PASSED' : '\nSMOKE TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1500);
