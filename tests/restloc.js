const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const doc = window.document;
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const ev = s => window.eval(s);
const evj = s => JSON.parse(JSON.stringify(ev(s)));

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  click(doc.querySelector('[data-tab="restaurants"]'));
  check('restaurants tab rendered', !!doc.querySelector('#viewport .ritem'), '');

  const groups = evj('EatoutsBridge.groupedListing().map(g=>({key:g.key,name:g.name,branches:g.branches.map(b=>({id:b.id,town:String((b.location||{}).town||"").trim()}))}))');
  const multi = groups.filter(g => g.branches.length > 1);
  const single = groups.filter(g => g.branches.length === 1);
  check('multi-branch brand exists', multi.length > 0, multi.length);
  check('single-branch brand exists', single.length > 0, single.length);

  /* prefer a brand that has 2+ branches in one town, so the badge path is covered */
  const townCounts = g => g.branches.reduce((m, b) => {
    const k = b.town.trim().toLowerCase();
    if (k) m[k] = (m[k] || 0) + 1;
    return m;
  }, {});
  const brand = multi.find(g => Object.values(townCounts(g)).some(n => n > 1)) || multi[0];
  const expected = townCounts(brand);

  /* ---------- town axis of a multi-branch brand ---------- */
  ev('state.restaurantOpen=' + JSON.stringify(brand.key) +
     ';state.restLocPicker={brand:' + JSON.stringify(brand.key) + ',axis:"town"};render()');
  let pop = doc.querySelector('#viewport .fpop.rest-loc-pop');
  check('rest-loc-pop opens', !!pop);
  let rows = pop ? pop.querySelectorAll('.loc-town-main') : [];
  check('town rows rendered', rows.length > 0, rows.length);

  const lbls = Array.from(rows).map(r => (r.querySelector('.lbl') || {}).textContent || '');
  check('.lbl has no "(N locations)"', lbls.every(t => t.indexOf('(') === -1 && t.indexOf('locations') === -1), JSON.stringify(lbls));
  check('.lbl is the bare town name', lbls.every(t => t.trim().length > 0 && t === t.trim()), JSON.stringify(lbls));

  const hasMultiTown = Object.values(expected).some(n => n > 1);
  const counts = Array.from(rows).map(r => r.querySelector('.loc-count'));
  const present = counts.filter(Boolean);
  if (hasMultiTown) {
    check('at least one .loc-count badge', present.length > 0, present.length);
    check('.loc-count holds digits only', present.every(c => /^\d+$/.test(c.textContent.trim())),
      JSON.stringify(present.map(c => c.textContent)));
    check('.loc-count values >= 2', present.every(c => Number(c.textContent.trim()) >= 2),
      JSON.stringify(present.map(c => c.textContent)));
  } else { console.log('skip  this brand has no town with 2+ branches'); }

  /* badge value = branch count for that town */
  let mismatch = null;
  Array.from(rows).forEach(r => {
    const town = (r.querySelector('.lbl') || {}).textContent.trim().toLowerCase();
    const badge = r.querySelector('.loc-count');
    const want = expected[town];
    const wantBadge = want > 1 ? String(want) : null;
    const got = badge ? badge.textContent.trim() : null;
    if (got !== wantBadge && !mismatch) mismatch = town + ' got ' + got + ' want ' + wantBadge;
  });
  check('badge numbers match branch counts', !mismatch, mismatch);

  /* rows with a single branch carry no badge */
  const singleTown = Object.keys(expected).find(t => expected[t] === 1);
  if (singleTown) {
    const row = Array.from(rows).find(r => (r.querySelector('.lbl') || {}).textContent.trim().toLowerCase() === singleTown);
    check('single-branch town has no badge', !!row && !row.querySelector('.loc-count'), singleTown);
  } else { console.log('skip  no single-branch town in this brand'); }

  const note = pop && pop.querySelector('.fpop-note');
  check('footer note has no location count', !note || (note.textContent.indexOf('locations') === -1 && !/\d/.test(note.textContent)),
    note ? note.textContent : '(none)');
  check('footer note wording', !note || note.textContent.trim() === 'Picking one makes it active', note ? note.textContent : '(none)');
  check('footer note text is centred', !note || window.getComputedStyle(note).textAlign === 'center',
    note ? window.getComputedStyle(note).textAlign : '(none)');

  /* picking a row still works */
  const pick = rows[Math.min(1, rows.length - 1)];
  const pickId = pick.getAttribute('data-id');
  click(pick);
  check('picking a town closes the picker', !doc.querySelector('#viewport .fpop.rest-loc-pop'));
  check('active branch recorded', ev('!!(state.restBranchOf && state.restBranchOf[' + JSON.stringify(brand.key) + '])'));

  /* ---------- area axis of the same brand ---------- */
  ev('state.restLocPicker={brand:' + JSON.stringify(brand.key) + ',axis:"area"};render()');
  pop = doc.querySelector('#viewport .fpop.rest-loc-pop');
  check('area axis opens', !!pop);
  check('area rows carry no loc-count', !pop || pop.querySelectorAll('.loc-area-option .loc-count').length === 0);
  check('area rows carry no lbl suffix', !pop || Array.from(pop.querySelectorAll('.loc-area-option span')).every(s => s.textContent.indexOf('locations') === -1));
  const areaNote = pop && pop.querySelector('.fpop-note');
  if (areaNote) check('area hint text is centred', window.getComputedStyle(areaNote).textAlign === 'center',
    window.getComputedStyle(areaNote).textAlign);
  else console.log('skip  no area-axis note shown');

  /* ---------- single-branch brand: no footer note ---------- */
  ev('state.restLocPicker={brand:' + JSON.stringify(single[0].key) + ',axis:"town"};render()');
  pop = doc.querySelector('#viewport .fpop.rest-loc-pop');
  check('single-branch picker opens', !!pop);
  check('single-branch picker has no footer note', !!pop && !pop.querySelector('.fpop-note'));
  check('single-branch rows have no badge', !!pop && pop.querySelectorAll('.loc-count').length === 0,
    pop ? pop.querySelectorAll('.loc-count').length : 'no pop');
  check('single-branch labels clean', !!pop && Array.from(pop.querySelectorAll('.lbl')).every(s => s.textContent.indexOf('(') === -1));

  ev('state.restLocPicker=null;render()');

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nREST-LOC TEST PASSED' : '\nREST-LOC TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);
