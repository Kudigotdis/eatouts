const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return ''; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));

const dom = new JSDOM(html, { url: 'http://localhost/index.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;

setTimeout(() => {
  let fails = 0;
  const check = (l, c, x) => { if (!c) { fails++; console.log('FAIL  ' + l + (x ? ' :: ' + x : '')); } else console.log('ok    ' + l); };

  const events = window.eval('JSON.stringify(FEATURED_EVENTS.map(e=>({id:e.id,day:e.day,flyer:e.flyer})))');
  const list = JSON.parse(events);
  check('8 featured events', list.length === 8, 'got ' + list.length);

  const days = list.map(e => e.day);
  const counts = days.reduce((a, d) => (a[d] = (a[d] || 0) + 1, a), {});
  check('7 distinct weekdays', Object.keys(counts).length === 7, JSON.stringify(counts));
  check('only Sunday has 2', counts[0] === 2 && Object.keys(counts).every(d => counts[d] === (d === '0' ? 2 : 1)), JSON.stringify(counts));

  list.forEach(e => {
    const f = path.join(APP_DIR, 'assets', 'images', 'events', e.flyer);
    check('flyer exists: ' + e.flyer, fs.existsSync(f));
  });

  const imgEvents = JSON.parse(window.eval('JSON.stringify(IMG.events)'));
  const rot = JSON.parse(window.eval('JSON.stringify(EVENT_ROT)'));
  const fly = JSON.parse(window.eval('JSON.stringify(FEATURED_FLYERS)'));
  check('FEATURED_FLYERS has 8 files', fly.length === 8, 'got ' + fly.length);
  fly.forEach(f => {
    check('  listed in IMG.events: ' + f, imgEvents.indexOf(f) > -1);
    check('  excluded from EVENT_ROT: ' + f, rot.indexOf(f) < 1 && rot.indexOf(f) === -1, JSON.stringify(rot.indexOf(f)));
  });
  check('EVENT_ROT still has images', rot.length >= 10, 'n=' + rot.length);

  const gal = JSON.parse(window.eval('JSON.stringify(GALLERY.filter(g=>g.cat==="Events").map(g=>g.file))'));
  check('gallery Events count matches IMG.events', gal.length === imgEvents.length, gal.length + ' vs ' + imgEvents.length);

  // ordering: featured cards come before the venue day-event cards
  const vp = window.document.getElementById('viewport');
  const kids = Array.from(vp.querySelectorAll('.ecard')).map(c => c.getAttribute('data-acc'));
  const firstFeat = kids.findIndex(k => k && k.indexOf('fe_') === 0);
  const firstVenue = kids.findIndex(k => k && k.indexOf('evt_') === 0);
  check('featured cards lead the feed', firstFeat === 0 && (firstVenue === -1 || firstVenue > firstFeat), JSON.stringify(kids.slice(0, 6)));
  check('venue day events still render', firstVenue > -1, JSON.stringify(kids.slice(0, 8)));

  // promo cards still render below
  const promoCards = kids.filter(k => k && k.indexOf('fe_') !== 0 && k.indexOf('evt_') !== 0);
  check('promo cards still render', promoCards.length > 0, 'n=' + promoCards.length);

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 8).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nCHECKS PASSED' : '\nCHECKS FAILED (' + fails + ')');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1500);
