#!/usr/bin/env node
/**
 * Supplier activation (T18): a profile published on eatouts-suppliers.html
 * lives in localStorage only. js/eatouts-supplier-directory.js must turn it
 * into a planner-directory record so the event builder can list and cost it,
 * and the public ?link=<slug> page must resolve it.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function inline(file) {
  const errors = [];
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  return { html, errors };
}

function boot(file, url, before) {
  const { html, errors } = inline(file);
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      if (before) before(w);
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

function profile(over) {
  return Object.assign({
    id: 'sup_1',
    slug: '',
    status: 'published',
    createdAt: 1, updatedAt: 1, publishedAt: 1,
    owner: { firstName: 'Thandi', lastName: 'Molefe', age: null, headshot: '' },
    business: {
      name: 'Mama Thandi Catering',
      tagline: 'Home-style catering in Gaborone',
      about: 'Ten years of weddings, launches and corporate lunches.',
      since: 2015, logo: ''
    },
    services: [
      { id: 'svc_a', categoryId: 'catering', typeId: null, title: 'Wedding buffet',
        description: '', baseRate: 180, rateType: 'Per person', minimum: 7, travelIncluded: true },
      { id: 'svc_b', categoryId: 'catering', typeId: null, title: 'Live cooking station',
        description: '', baseRate: 1200, rateType: 'Per booking', minimum: 7, travelIncluded: true }
    ],
    pricing: { hourlyRate: null, halfDayRate: null, fullDayRate: null, depositPercent: 30, paymentTerms: 'EFT', packages: [] },
    discounts: [],
    gallery: { images: [], videos: [] },
    portfolio: [],
    contact: { whatsapp: '26771234567', phone: '', email: '', preferred: 'whatsapp' },
    location: { district: '', districtName: 'South East', town: 'Gaborone', area: 'Extension 12', travelRadiusKm: 50, servesNationwide: false },
    availability: { days: [], peakSeason: '', leadTimeDays: 7, notes: '' },
    trust: { yearsActive: 10, insured: true, licensed: true, badges: [] },
    metrics: { views: 0, enquiries: 0, bookings: 0 }
  }, over || {});
}

const PUBLISHED = profile();
const DRAFT = profile({
  id: 'sup_2', status: 'draft',
  business: { name: 'Draft Kitchen', tagline: '', about: '', since: null, logo: '' }
});

/* ---------- baseline: how many directory records ship with the demo set ---------- */
const probe = boot('eatout_event_builder.html', 'http://127.0.0.1/eatout_event_builder.html');
check('builder boots with the directory script', !probe.errors.some(e => e.indexOf('missing script') === 0),
  probe.errors.filter(e => e.indexOf('missing script') === 0).join(' | '));
const demoCount = (probe.w.EATOUTS_SUPPLIERS || []).length;
check('demo directory has records', demoCount > 0, demoCount);
check('no profiles means no bridged records',
  (probe.w.EATOUTS_SUPPLIERS || []).filter(s => s.source === 'supplier-profile').length === 0);

/* ---------- the bridge reads published profiles only ---------- */
const b = boot('eatout_event_builder.html', 'http://127.0.0.1/eatout_event_builder.html', w => {
  w.localStorage.setItem('eatouts_suppliers_v1', JSON.stringify([PUBLISHED, DRAFT]));
});
const w = b.w;

check('bridge is exposed', !!w.EatoutsSupplierDirectory && typeof w.EatoutsSupplierDirectory.find === 'function');
const rec = w.EatoutsSupplierDirectory.find('mama-thandi-catering');
check('a published profile resolves by slug', !!rec && rec.businessName === 'Mama Thandi Catering', rec && rec.businessName);
check('a draft profile is not published', !w.EatoutsSupplierDirectory.find('draft-kitchen'));
check('the record carries a planner bucket', !!rec && rec.catId === 'food_catering', rec && rec.catId);
check('the record carries the onboarding service', !!rec && rec.service === 'Wedding buffet', rec && rec.service);
check('the record carries a price and unit', !!rec && rec.price === 180 && rec.unit === 'per person',
  rec && (rec.price + ' / ' + rec.unit));
check('the record carries a readable price label', !!rec && rec.displayPrice === 'P180', rec && rec.displayPrice);
check('the record lists the second service as an add-on',
  !!rec && rec.addons.length === 1 && rec.addons[0] === 'Live cooking station (P1,200)',
  rec && (rec.addons || []).join(' | '));
check('the record carries the service area', !!rec && rec.serviceArea[0] === 'Gaborone',
  rec && (rec.serviceArea || []).join(','));
check('the record invents no rating', !!rec && rec.rating === null, rec && rec.rating);

/* ---------- the planner can now see and cost it ---------- */
const dir = w.EATOUTS_SUPPLIERS || [];
check('exactly one published profile joined the directory',
  dir.filter(s => s.source === 'supplier-profile').length === 1, dir.filter(s => s.source === 'supplier-profile').length);
check('the demo directory is untouched', dir.length === demoCount + 1, dir.length + ' vs ' + demoCount);

const found = w.findSupplier('local_sup_1');
check('the builder resolves the new supplier by id', !!found && /Mama Thandi/.test(found.businessName),
  found && found.businessName);
const items = w.supplierProfileItems(w.findSupplier('local_sup_1'));
check('the cost model prices the base service', !!items[0] && items[0].price === 180 && items[0].unit === 'per person',
  items[0] && (items[0].price + ' / ' + items[0].unit));
check('the cost model prices the add-on', !!items[1] && items[1].price === 1200, items[1] && items[1].price);
w.EatoutsSupplierDirectory.sync();
check('re-syncing does not duplicate records',
  w.EATOUTS_SUPPLIERS.filter(s => s.source === 'supplier-profile').length === 1);

/* ---------- the public link now works ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const pub = boot('eatouts-suppliers.html', 'http://127.0.0.1/eatouts-suppliers.html?link=mama-thandi-catering', w2 => {
    w2.localStorage.setItem('eatouts_suppliers_v1', JSON.stringify([PUBLISHED]));
  });
  await sleep(300);                       /* the suppliers page renders on DOMContentLoaded */
  const h1 = pub.doc.querySelector('#scroll h1');
  check('?link=<slug> renders the activated supplier', !!h1 && /Mama Thandi Catering/.test(h1.textContent),
    h1 && h1.textContent);
  const body = pub.doc.querySelector('#scroll').textContent.replace(/\s+/g, ' ');
  check('the public page quotes the supplier rate', /From P180/.test(body), body.slice(0, 120));

  console.log('');
  console.log('window errors: ' + b.errors.length + (b.errors.length ? ' -> ' + b.errors.join(' | ') : ''));
  if (fails) console.log('FAILED: ' + fails + ' check(s)');
  else console.log('SUPPLIER-ACTIVATE TEST PASSED');
  process.exit(fails ? 1 : 0);
})();

