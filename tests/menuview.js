#!/usr/bin/env node
/**
 * Menu view pages.
 *
 * The two Menu views (category list + item list) now lead with a
 * Restaurant-Card instead of the breadcrumb, with enlarged thumbnails and
 * typography, and a bottom Back button. Boots index.html in jsdom, opens a
 * venue Menu, and asserts the structure + computed sizes; then verifies the
 * card opens the venue info page (About).
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
  const f = path.join(APP_DIR, s.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script: ' + s); return '<!-- missing ' + s + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { url: 'http://localhost/index.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const { window: w } = dom;
const doc = w.document;
const ev = s => w.eval(s);
const click = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const px = el => el ? parseFloat(w.getComputedStyle(el).fontSize) : NaN;

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };
  const appErrors = errors.filter(e => e.indexOf('missing script') !== 0);

  /* ---------- open a real venue's Menu ---------- */
  const opened = ev(`(function(){
    var L = EatoutsBridge.listing();
    if(!L.length) return null;
    var id = L[0].id;
    state.tab='restaurants';
    state.restaurantOpen=id;
    state.restaurantView={id:id,brand:id,view:'menu',promoId:null};
    state.menuCat=null; state.menuOpen=null; state.checkoutView=false; state.splitOpen=false;
    EatoutsBridge.setActive(id);
    render();
    return {id:id,name:L[0].name};
  })()`);
  check('a venue menu opened', !!(opened && opened.id), opened && JSON.stringify(opened));

  const vp = doc.getElementById('viewport');

  /* ---------- category list view ---------- */
  const card = vp.querySelector('.menu-view .restcard');
  check('Restaurant-Card replaces the crumb in the Menu view', !!card, !!card);
  const cname = vp.querySelector('.menu-view .restcard-name');
  check('card renders the venue name', !!cname && cname.textContent.trim().length > 0, cname && cname.textContent);
  check('no breadcrumb in the Menu view', !vp.querySelector('.menu-view .crumb'));
  check('categories view keeps a slim "Menu" heading', /^Menu$/.test((vp.querySelector('.menu-view .phead h2') || {}).textContent || ''));
  const h2 = vp.querySelector('.menu-view .phead h2');
  check('.phead h2 is 28px', px(h2) >= 27, h2 && w.getComputedStyle(h2).fontSize);
  const cmeta = vp.querySelector('.menu-view .cat-meta');
  check('.cat-meta doubled to 21px', px(cmeta) >= 21, cmeta && w.getComputedStyle(cmeta).fontSize);
  check('per-category heart removed from the categories view', !vp.querySelector('.menu-view .cat-wrap > .ico-btn'));
  const crow = vp.querySelector('.menu-view .cat-row');
  check('.cat-row centres its group', !!crow && w.getComputedStyle(crow).justifyContent === 'center', crow && w.getComputedStyle(crow).justifyContent);
  check('.cat-row padding is symmetrical', !!crow && w.getComputedStyle(crow).paddingRight === w.getComputedStyle(crow).paddingLeft, crow && w.getComputedStyle(crow).paddingRight + '/' + w.getComputedStyle(crow).paddingLeft);
  const cminfo = vp.querySelector('.menu-view .cat-row .minfo');
  check('.cat-row .minfo does not flex-grow', !!cminfo && w.getComputedStyle(cminfo).flexGrow === '0', cminfo && w.getComputedStyle(cminfo).flexGrow);
  check('.cat-row .minfo text is centred', !!cminfo && w.getComputedStyle(cminfo).textAlign === 'center', cminfo && w.getComputedStyle(cminfo).textAlign);
  const cphead = vp.querySelector('.menu-view .phead');
  check('.menu-view .phead slimmed to 8px', !!cphead && w.getComputedStyle(cphead).paddingTop === '8px' && w.getComputedStyle(cphead).paddingBottom === '8px', cphead && w.getComputedStyle(cphead).paddingTop + '/' + w.getComputedStyle(cphead).paddingBottom);
  check('.menu-view .phead h2 has no bottom margin', !!h2 && w.getComputedStyle(h2).marginBottom === '0px', h2 && w.getComputedStyle(h2).marginBottom);
  const savepad = vp.querySelector('.menu-view .pad [data-act="saveRestSummary"]');
  const savewrap = savepad && savepad.closest('.pad');
  check('Save Summary pad has 40px top / 4px bottom', !!savewrap && w.getComputedStyle(savewrap).paddingTop === '40px' && w.getComputedStyle(savewrap).paddingBottom === '4px', savewrap && w.getComputedStyle(savewrap).paddingTop + '/' + w.getComputedStyle(savewrap).paddingBottom);
  const cspacer = Array.prototype.find.call(vp.querySelectorAll('.menu-view > div'), el => el.getAttribute('style') === 'height:10px');
  check('menu-view separator tightened to 10px', !!cspacer, !!cspacer);
  check('bottom Back button on the categories view', !!vp.querySelector('.menu-view [data-act="backFromRestView"]'));

  /* ---------- item list view ---------- */
  const cat = ev(`(function(){
    var M = curMenu();
    if(!M.length) return null;
    state.menuCat = M[0].id;
    state.menuOpen = null;
    render();
    return {id:M[0].id,name:M[0].name,items:M[0].items.length};
  })()`);
  check('a menu category opened', !!(cat && cat.id), cat && JSON.stringify(cat));
  check('card present on the item list too', !!vp.querySelector('.menu-view .restcard'));
  check('no breadcrumb on the item list', !vp.querySelector('.menu-view .crumb'));
  const mthumb = vp.querySelector('.menu-view .mthumb');
  check('.mthumb enlarged to 90px', mthumb && parseFloat(w.getComputedStyle(mthumb).width) >= 89, mthumb && w.getComputedStyle(mthumb).width);
  const h2c = vp.querySelector('.menu-view .phead h2');
  check('item-list .phead h2 is 28px', px(h2c) >= 27, h2c && w.getComputedStyle(h2c).fontSize);
  const mtitle = vp.querySelector('.menu-view .mtitle');
  check('.mtitle is 20px', px(mtitle) === 20, mtitle && w.getComputedStyle(mtitle).fontSize);
  const mprice = vp.querySelector('.menu-view .mprice');
  check('.mprice is 18px', px(mprice) === 18, mprice && w.getComputedStyle(mprice).fontSize);
  const ico = vp.querySelector('.menu-view .mitem > .ico-btn');
  check('item heart moved to right:24px', ico && Math.round(parseFloat(w.getComputedStyle(ico).right)) === 24, ico && w.getComputedStyle(ico).right);
  check('item heart reduced below 44px', ico && parseFloat(w.getComputedStyle(ico).width) <= 36, ico && w.getComputedStyle(ico).width);
  check('bottom Back to Menu button on the item list', !!vp.querySelector('.menu-view [data-act="backCats"]'));

  /* ---------- item label row + stepper ---------- */
  const clbl = vp.querySelector('.menu-view .ctr .lbl');
  check('.ctr label is left-aligned', !!clbl && w.getComputedStyle(clbl).textAlign === 'left', clbl && w.getComputedStyle(clbl).textAlign);
  check('.ctr label items start-aligned', !!clbl && w.getComputedStyle(clbl).alignItems === 'flex-start', clbl && w.getComputedStyle(clbl).alignItems);
  const cprice = vp.querySelector('.menu-view .ctr .lbl em.price');
  check('.ctr price em is 20px', !!cprice && px(cprice) === 20, cprice && w.getComputedStyle(cprice).fontSize);
  check('.ctr price em is bold 800', !!cprice && w.getComputedStyle(cprice).fontWeight === '800', cprice && w.getComputedStyle(cprice).fontWeight);
  check('.ctr price em is black', !!cprice && w.getComputedStyle(cprice).color === 'rgb(0, 0, 0)', cprice && w.getComputedStyle(cprice).color);
  const stpbtn = vp.querySelector('.menu-view .stp button');
  check('.stp button is 50x45 @24px', !!stpbtn && parseFloat(w.getComputedStyle(stpbtn).width) === 50 && parseFloat(w.getComputedStyle(stpbtn).height) === 45 && px(stpbtn) === 24, stpbtn && w.getComputedStyle(stpbtn).width + 'x' + w.getComputedStyle(stpbtn).height + ' ' + w.getComputedStyle(stpbtn).fontSize);
  const stpval = vp.querySelector('.menu-view .stp .val');
  check('.stp .val is 20px', !!stpval && px(stpval) === 20, stpval && w.getComputedStyle(stpval).fontSize);

  const single = ev(`(function(){
    var M = curMenu();
    for(var ci=0;ci<M.length;ci++){
      var items=(M[ci].items)||[];
      for(var ii=0;ii<items.length;ii++){
        if(!Array.isArray(items[ii][3])){
          state.menuCat=M[ci].id; state.menuOpen=items[ii][0]; render();
          var mitem=document.querySelector('#viewport .mitem[data-macc="'+items[ii][0]+'"]');
          var row=mitem&&mitem.querySelector('.ctr [data-si]');
          var lbl=row&&row.closest('.ctr').querySelector('.lbl');
          return { name:items[ii][1], label:lbl?lbl.textContent.trim():'', firstTag:lbl&&lbl.firstChild?lbl.firstChild.nodeName:null, hasPrice:!!(lbl&&lbl.querySelector('em.price')) };
        }
      }
    }
    return null;
  })()`);
  check('single-price item row shows no item-name label', !!single && single.label.indexOf(single.name) === -1 && single.firstTag === 'EM' && single.hasPrice, single && JSON.stringify(single));

  /* ---------- card tap opens the venue info page ---------- */
  click(vp.querySelector('.menu-view .restcard-main'));
  check('inline venue-about screen is gone after card tap', vp.querySelector('.rabout-hero') === null);
  check('About Back button returns to the Menu', !!vp.querySelector('[data-act="backCats"]'));

  /* ---------- tagline cascade never empty ---------- */
  const tag = ev(`(function(){
    var L = EatoutsBridge.listing();
    var bad = [];
    for(var i=0;i<L.length && i<40;i++){
      var r = EatoutsBridge.byId(L[i].id);
      var b = EatoutsBridge.bundleOf(L[i].id);
      var p = (b && b.profile) || {};
      var t = p.tagline || (r && r.directory && r.directory.description) || (r && r.category) || EatoutsBridge.placeLabel(r) || '';
      if(!String(t).trim()) bad.push(L[i].name);
    }
    return bad;
  })()`);
  check('every card has a non-empty second line', Array.isArray(tag) && tag.length === 0, tag && JSON.stringify(tag));

  check('no runtime errors', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  console.log('');
  console.log(fails === 0 ? 'MENU VIEW TEST PASSED' : 'MENU VIEW TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 ? 0 : 1);
}, 1000);
