#!/usr/bin/env node
/**
 * eatouts-admin-dashboard.html — the "Access & security" panel (Milestone B2).
 *
 * Boots the dashboard in jsdom with a stubbed /api/admin/access payload and
 * asserts the panel the operator actually reads: the bypass expiry, the gate
 * mode, the devices (current browser flagged, revoked one labelled), the
 * grouped refusals, and that the revoke button POSTs to /api/admin/revoke-all
 * and then reloads the overview.
 *
 * EO.guard() is short-circuited (there is no session in jsdom); everything
 * downstream of it — the part this suite is about — runs untouched.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP = path.resolve(__dirname, '..');

function inline(file) {
  const html = fs.readFileSync(path.join(APP, file), 'utf8');
  return html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP, src.split('?')[0].replace(/\//g, path.sep));
    return fs.existsSync(f) ? '<script>' + fs.readFileSync(f, 'utf8') + '</script>' : '<!-- missing ' + src + ' -->';
  });
}

const errors = [];
const calls = [];
const PAYLOAD = {
  ok: true,
  gate: 'monitor',
  epoch: 3,
  windowDays: 7,
  bypass: { active: true, user: 'ops', expires: Date.now() + 86400000, device: 'abcdef0123456789', current: 'abcdef0123456789' },
  devices: [
    { id: 'adev_1', user: 'ops', device: 'abcdef0123456789', current: true, label: 'chrome|windows', createdAt: 1, lastSeenAt: 2, country: 'ZW', asn: 1221, revokedAt: null },
    { id: 'adev_2', user: 'ops', device: '9999999999999999', current: false, label: 'safari|mac', createdAt: 1, lastSeenAt: null, country: 'BW', asn: 37662, revokedAt: 5 }
  ],
  denied: {
    total: 41,
    byRule: [{ rule: 'datacenter_asn', stage: 2, country: 'US', count: 41, last: Date.now() }],
    recent: [{ at: Date.now(), stage: 2, rule: 'datacenter_asn', country: 'US', asn: 16509, path: '/eatouts-about', confidence: 80 }]
  },
  warnings: []
};

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));

/* EO.guard() would redirect with no session; the panel under test is downstream
   of it, so short-circuit it once every src script has run. */
const html = inline('eatouts-admin-dashboard.html')
  .replace('</body>', '<script>try{EO.guard=function(){return true;};}catch(e){window.__g=String(e);}</script></body>');

const dom = new JSDOM(html, {
  url: 'http://localhost/eatouts-admin-dashboard.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w) {
    w.confirm = () => true;
    w.alert = () => null;
    w.fetch = function (url, opts) {
      const u = String(url);
      calls.push({ url: u, method: (opts && opts.method) || 'GET' });
      if (u.indexOf('/api/admin/access') > -1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PAYLOAD) });
      }
      if (u.indexOf('/api/admin/revoke-all') > -1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, epoch: 4 }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    };
  }
});

setTimeout(() => {
  const { window } = dom;
  const doc = window.document;
  let fails = 0;
  const check = (label, cond, extra) => {
    if (cond) console.log('ok    ' + label);
    else { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  };

  const section = doc.querySelector('.acc[data-key="access"]');
  check('the access section is rendered', !!section);
  check('the access section is titled', !!section && /Access & security/.test(section.textContent));

  const ac = doc.getElementById('ac');
  const text = ac ? ac.textContent : '';
  check('#ac exists', !!ac);
  check('the bypass banner shows the expiry', /Bypass active until/.test(text), text.slice(0, 120));
  check('the gate mode is shown', /gate monitor/.test(text));
  check('the epoch is shown', /epoch 3/.test(text));
  check('both devices render', /chrome\|\/windows|chrome\|windows/.test(text) && /safari\|mac/.test(text));
  check('the current browser is flagged', /This browser/.test(text));
  check('a revoked device is labelled', /Revoked/.test(text));
  check('the denial summary renders', /datacenter_asn/.test(text) && /41 refusal/.test(text));
  check('the recent denial renders', /\/eatouts-about/.test(text));
  check('the section sub reports the bypass', /bypass until/.test(section.querySelector('.acc-sub').textContent),
    section.querySelector('.acc-sub').textContent);
  check('the access dot is green while a bypass is live',
    section.querySelector('.vis-dot').classList.contains('green'));

  const revoke = ac && ac.querySelector('[data-ac-act="revoke"]');
  check('the revoke button is present', !!revoke);
  if (revoke) revoke.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

  setTimeout(() => {
    check('clicking revoke POSTs to /api/admin/revoke-all',
      calls.some((c) => c.url.indexOf('/api/admin/revoke-all') > -1 && c.method === 'POST'),
      JSON.stringify(calls));
    check('the panel reloads the overview after a revoke',
      calls.filter((c) => c.url.indexOf('/api/admin/access') > -1).length >= 2,
      JSON.stringify(calls.map((c) => c.url)));
    check('no window errors', errors.length === 0, errors.join(' | '));
    console.log(fails ? '\nDASHBOARD-ACCESS-PANEL FAILED (' + fails + ')' : '\nDASHBOARD-ACCESS-PANEL PASSED');
    process.exit(fails ? 1 : 0);
  }, 300);
}, 800);
