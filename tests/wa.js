const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(html, {
  url: 'http://localhost/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const w = dom.window;

setTimeout(() => {
  const flagship = String(w.eval('CONFIG.whatsapp') || '').replace(/[^\d]/g, '');

  check('boot: no window errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('resolveVenueWhatsapp exists', typeof w.resolveVenueWhatsapp === 'function');
  check('null venue -> flagship', w.resolveVenueWhatsapp(null) === flagship, 'got ' + w.resolveVenueWhatsapp(null));

  const direct = w.resolveVenueWhatsapp({ whatsapp: '+267 71 111 111' });
  check('venue.whatsapp direct wins', direct === '26771111111', 'got ' + direct);

  const viaContacts = w.resolveVenueWhatsapp({
    contacts: [
      { number: '720000000', countryCode: '+267', primary: true },
      { number: '730000000', countryCode: '+267', whatsapp: true, active: true },
      { number: '740000000', countryCode: '+267', active: false },
    ],
  });
  check('whatsapp-flagged contact beats primary', viaContacts === '267730000000', 'got ' + viaContacts);

  const noWa = w.resolveVenueWhatsapp({ contacts: [{ number: '720000000', countryCode: '+267' }] });
  check('falls back to first active contact', noWa === '267720000000', 'got ' + noWa);

  const inactive = w.resolveVenueWhatsapp({ contacts: [{ number: '790000000', active: false }] });
  check('inactive-only venue -> flagship', inactive === flagship, 'got ' + inactive);

  const empty = w.resolveVenueWhatsapp({ contacts: [] });
  check('empty contacts -> flagship', empty === flagship, 'got ' + empty);

  const linkVenue = w.waLink('hello', { whatsapp: '26771111111' });
  check('waLink uses venue number', linkVenue.includes('phone=26771111111'), linkVenue);
  const linkDefault = w.waLink('hello');
  check('waLink without venue -> flagship', linkDefault.includes('phone=' + flagship), linkDefault);
  check('waLink encodes text', linkDefault.includes('text=hello'));

  const rcVenue = w.restaurantContact({ whatsapp: '26771111111' });
  check('restaurantContact(venue).number', rcVenue.number === '26771111111', JSON.stringify(rcVenue));
  check('restaurantContact(venue).display is +number', rcVenue.display === '+26771111111', rcVenue.display);
  const rcFlag = w.restaurantContact(null);
  check('restaurantContact(null).display uses CONFIG.displayNumber', rcFlag.display === String(w.eval('CONFIG.displayNumber') || ''), rcFlag.display);

  const src = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  const lines = src.split(/\r?\n/);
  const flagged = [];
  lines.forEach((l, i) => {
    if (/function waLink/.test(l)) return;
    if (!/(?<!function\s)waLink\(/.test(l)) return;
    const ctx = lines.slice(Math.max(0, i - 14), i + 1).join('\n');
    const flagshipIntended = /act==="waPoetry"|act==="waFeatEvent"|act==="waAbout"|function renderAboutSocialRow/.test(ctx);
    const venueAware = /,\s*(r|f&&f\.restaurant|evInfo\.restaurant|curRestaurant\(\))\s*\)/.test(l);
    if (!flagshipIntended && !venueAware) flagged.push('line ' + (i + 1) + ': ' + l.trim().slice(0, 90));
  });
  check('every waLink call is venue-aware or intentionally flagship', flagged.length === 0, flagged.join(' | '));

  console.log('');
  if (fails) { console.log('WA TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('WA TEST PASSED');
}, 800);
