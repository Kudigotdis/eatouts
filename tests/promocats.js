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
const change = el => el.dispatchEvent(new window.Event('change', { bubbles: true }));
const ev = s => window.eval(s);

const readJson = f => JSON.parse(fs.readFileSync(path.join(APP_DIR, f), 'utf8'));
const bevData = readJson('assets/data/beverages.json');
const alcData = readJson('assets/data/alcohols.json');
const promoData = readJson('assets/data/beverage-and-bar-promotions.json');

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* jsdom has no fetch: hand the app its catalogues directly. */
  ev('window._BEV=' + JSON.stringify({
    beverages: bevData, alcohols: alcData, promos: promoData
  }) + ';window._BEV_PROMO_MAP=null;window._BEV_LOAD=null');

  /* ---------- category derivation ---------- */
  check('Food Type Promo -> Food', ev('promoCategoryOf({type:"Food Type Promo"})') === 'Food');
  check('Beverage + Food Promo -> Combo', ev('promoCategoryOf({type:"Beverage + Food Promo"})') === 'Combo');
  check('Platter Without Beer -> Food', ev('promoCategoryOf({type:"Platter Special Without Beer/Cider"})') === 'Food');
  check('Platter With Beer -> Combo', ev('promoCategoryOf({type:"Platter Special With Beer/Cider"})') === 'Combo');
  check('Ladies Night Drink -> Beverage', ev('promoCategoryOf({type:"Bonus Ladies Night Drink Promo"})') === 'Beverage');
  check('explicit Beverage wins', ev('promoCategoryOf({type:"Food Type Promo",category:"Beverage"})') === 'Beverage');
  check('untagged copy defaults to Food', ev('promoCategoryOf({type:"Promo",title:"Pasta night"})') === 'Food');

  /* ---------- subtypes ---------- */
  const barTags = evjSub('promoSubtypeList({subtype:"Beers"},null)');
  check('bar promo keeps its drink style',
    barTags.indexOf('Beers') > -1 && barTags.indexOf('Beverages') > -1, JSON.stringify(barTags));
  check('food promo borrows venue cuisines',
    JSON.stringify(evjSub('promoSubtypeList({type:"Food Type Promo"},{types:["Italian","Cafe"]})')) === '["Italian","Cafe"]');
  const wineTags = evjSub('promoSubtypeList({type:"Bonus Pasta & Wine Promo"},null)');
  check('drink words map to a drink tick',
    wineTags.indexOf('Red Wines') > -1, JSON.stringify(wineTags));
  check('a gin promo answers to Gin and to Spirits',
    (function (t) { return t.indexOf('Gin') > -1 && t.indexOf('Spirits') > -1; })(
      evjSub('promoSubtypeList({type:"Gin Tasting Promo"},null)')),
    JSON.stringify(evjSub('promoSubtypeList({type:"Gin Tasting Promo"},null)')));

  /* ---------- segments + popup ---------- */
  click(doc.querySelector('[data-tab="promos"]'));
  ev('state.promoFilterOpen=true;state.promoTypePicker=true;render();renderControlBar()');
  const popup = doc.querySelector('#filter-bar .fpop.type-pop');
  check('type popup still opens', !!popup);
  const segs = doc.querySelectorAll('#filter-bar .type-pop .segbtn');
  check('4 category segments', segs.length === 4, segs.length);
  check('segment labels',
    Array.prototype.map.call(segs, b => b.textContent).join('|') === 'All|Combos|Food|Beverages',
    Array.prototype.map.call(segs, b => b.textContent).join('|'));
  check('All segment starts on', !!segs[0].classList.contains('on'));
  check('checkbox list rendered', doc.querySelectorAll('#filter-bar .typepop-option').length > 0);
  check('checkbox inputs carry data-promo-subtype', !!doc.querySelector('#filter-bar input[data-promo-subtype]'));
  check('two style groups', doc.querySelectorAll('#filter-bar .typepop-group-title').length === 2,
    doc.querySelectorAll('#filter-bar .typepop-group-title').length);
  check('search field present', !!doc.querySelector('#promoSubtypeSearch'));

  /* pick the Beverages segment */
  click(Array.prototype.filter.call(segs, b => b.getAttribute('data-val') === 'Beverage')[0]);
  check('segment pick keeps the popup open', !!doc.querySelector('#filter-bar .fpop.type-pop'));
  check('button label reads Beverages', /Beverages/.test(doc.querySelector('.pf-type span').textContent),
    doc.querySelector('.pf-type span').textContent);
  check('beverage segment shows drinks only',
    Array.prototype.map.call(doc.querySelectorAll('#filter-bar .typepop-group-title'), s => s.textContent).join('|') === 'Drinks',
    Array.prototype.map.call(doc.querySelectorAll('#filter-bar .typepop-group-title'), s => s.textContent).join('|'));
  const bevTicks = evjSub('(promoSubtypeGroups("Beverage")[0]||{options:[]}).options');
  check('beverage ticks are the fixed list, in order',
    bevTicks.join(',') === 'Beverages,Spirits,Beers,Brandy,Champagne,Ciders,Cold Drinks,Red Wines,Fizzy Drinks,Fruit Juices,Gin,Tequila,Rum,Vodka',
    bevTicks.join(','));
  check('the tick list has no All option', bevTicks.indexOf('All') === -1, JSON.stringify(bevTicks));
  check('food segment lists cuisines only',
    evjSub('promoSubtypeGroups("Food").map(function(g){return g.name;})').join('|') === 'Cuisines',
    evjSub('promoSubtypeGroups("Food").map(function(g){return g.name;})').join('|'));

  /* horizontal swipe across the popup moves one segment along */
  click(Array.prototype.filter.call(doc.querySelectorAll('#filter-bar .type-pop .segbtn'),
    b => b.getAttribute('data-val') === 'Food')[0]);
  check('picked the Food segment', ev('state.promoType') === 'Food', ev('state.promoType'));
  const pop2 = doc.querySelector('#filter-bar .fpop.type-pop');
  pop2.dispatchEvent(new window.MouseEvent('pointerdown', { clientX: 200, clientY: 300, bubbles: true }));
  doc.dispatchEvent(new window.MouseEvent('pointermove', { clientX: 60, clientY: 306, bubbles: true }));
  check('swipe switches the segment', ev('state.promoType') === 'Beverage', ev('state.promoType'));
  check('the popup stays open after a swipe', !!doc.querySelector('#filter-bar .fpop.type-pop'));

  /* All closes the popup and drops every tick */
  ev('state.promoSubtypes=["Italian"];render();renderControlBar()');
  const segAll = Array.prototype.filter.call(doc.querySelectorAll('#filter-bar .type-pop .segbtn'),
    b => b.getAttribute('data-val') === 'All')[0];
  click(segAll);
  check('All closes the popup', !doc.querySelector('#filter-bar .fpop.type-pop'));
  check('All clears the ticks', ev('state.promoSubtypes.length') === 0, JSON.stringify(evjSub('state.promoSubtypes')));

  /* ---------- feed filtering ---------- */
  const barCount = promoData.promotions.length;
  check('bar promo records built', ev('beveragePromoRecords().length') === barCount, ev('beveragePromoRecords().length'));

  const dayWithBar = ev('(function(){for(let d=0;d<7;d++){if(beveragePromosOnDay(DAY_NAMES[d]).length)return d;}return -1;})()');
  check('some weekday carries a bar promo', dayWithBar >= 0, dayWithBar);
  ev('state.promoDay=' + dayWithBar + ';state.promoType="All";state.promoSubtypes=[]');

  const all = evjSub('promosOnDay(state.promoDay).map(function(e){return promoCategoryOf(e.promo);})');
  check('All segment mixes categories', all.indexOf('Beverage') > -1 && all.indexOf('Food') > -1,
    JSON.stringify(all.slice(0, 6)));

  ev('state.promoType="Beverage"');
  const bevOnly = evjSub('promosOnDay(state.promoDay).map(function(e){return promoCategoryOf(e.promo);})');
  check('Beverage segment is all Beverage', bevOnly.length > 0 && bevOnly.every(c => c === 'Beverage'),
    JSON.stringify(bevOnly.slice(0, 6)));

  ev('state.promoType="Food"');
  const foodOnly = evjSub('promosOnDay(state.promoDay).map(function(e){return promoCategoryOf(e.promo);})');
  check('Food segment is all Food', foodOnly.every(c => c === 'Food'), JSON.stringify(foodOnly.slice(0, 6)));

  ev('state.promoType="Combo"');
  const comboOnly = evjSub('promosOnDay(state.promoDay).map(function(e){return promoCategoryOf(e.promo);})');
  check('Combo segment is all Combo', comboOnly.every(c => c === 'Combo'), JSON.stringify(comboOnly.slice(0, 6)));

  /* subtype tick narrows the feed further */
  ev('state.promoType="Beverage";state.promoSubtypes=["Beers"]');
  const beers = evjSub('promosOnDay(state.promoDay)');
  check('Beers tick keeps only beer promos',
    beers.length > 0 && beers.every(e => e.promo.subtype === 'Beers' || /beer/i.test(e.promo.type + ' ' + e.promo.title)),
    JSON.stringify(beers.slice(0, 4).map(e => e.promo.id)));
  ev('state.promoSubtypes=[];state.promoType="All"');

  /* ---------- card + detail ---------- */
  ev('render();renderControlBar()');
  const card = doc.querySelector('#viewport .ecard[data-acc="bevp-' + promoData.promotions[0].id + '"]');
  check('bar promo card renders', !!card);
  if (card) {
    check('card shows its own artwork',
      (card.querySelector('.pimg img') || {}).getAttribute &&
      /assets\/images\/(alcohol|beverage)-promos\//.test(card.querySelector('.pimg img').getAttribute('src')),
      card.querySelector('.pimg img') && card.querySelector('.pimg img').getAttribute('src'));
    check('card does not print a P0.00 price', !/P0\.00/.test(card.textContent), card.textContent.trim().slice(0, 120));
    const row = card.querySelector('.ico-row');
    check('promo card has a left-aligned icon row', !!row && !/split/.test(row.className), row && row.className);
    if (row) {
      const pid = 'bevp-' + promoData.promotions[0].id;
      check('promo card row is heart · Reserve · WhatsApp',
        row.children.length === 3 &&
        row.children[0].getAttribute('data-act') === 'toggleFav' &&
        row.children[1].getAttribute('data-act') === 'openPromo' &&
        row.children[2].getAttribute('data-act') === 'waPromo',
        row.children.length + ' children');
      check('promo card heart saves a promo favourite',
        row.children[0].getAttribute('data-ftype') === 'promo' &&
        row.children[0].getAttribute('data-fref') === pid &&
        /heart_(active|inactive)_icon/.test(row.children[0].querySelector('img').getAttribute('src')));
      check('promo card middle is the Reserve icon',
        row.children[1].classList.contains('ico-btn') &&
        /Reserve_icon\.png/.test(row.children[1].querySelector('img').getAttribute('src')) &&
        row.children[1].getAttribute('data-id') === pid,
        row.children[1].outerHTML.slice(0, 140));
      check('promo card WhatsApp uses the on icon',
        /whatsApp_icon_on/.test(row.children[2].querySelector('img').getAttribute('src')));
    }
    click(card.querySelector('.phead-btn'));
    const detail = doc.querySelector('#viewport .scroll');
    check('detail opens for a bar promo', !!detail);
    if (detail) {
      check('detail has no zero-price reserve block', !/Estimated Total/.test(detail.textContent));
      check('detail offers a WhatsApp icon share', !!detail.querySelector('[data-act="waPromo"] img'));
      check('detail shows the drink style', /Drink style/.test(detail.textContent));
    }
  }

  /* ---------- icon integration matrix ----------
     waIconButton gained an optional extra-attributes arg so promo cards can
     carry data-promo / data-ev, and both remaining "btn wa full" cards now
     use a .ico-row split (heart left, WhatsApp icon right). */
  const waExtra = String(ev('waIconButton("waX","r1","Share",\' data-foo="bar"\')'));
  check('waIconButton keeps act + ref', /data-act="waX"/.test(waExtra) && /data-id="r1"/.test(waExtra));
  check('waIconButton forwards extra attrs', /data-foo="bar"/.test(waExtra));
  check('waIconButton still uses the on icon', /whatsApp_icon_on/.test(waExtra));

  /* restaurant promo detail card */
  ev('window.__bof=null;' +
     'if(window.EatoutsBridge&&EatoutsBridge.bundleOf){window.__bof=EatoutsBridge.bundleOf;' +
     'EatoutsBridge.bundleOf=function(){return {promos:{"Monday":[{id:"p-x",title:"Combo Deal",price:50,was:80,save:30,valid:"Mon",desc:"Test deal",items:["Drink"]}]}};};}')
  const restDetail = String(ev('renderRestaurantPromoDetail({id:"rest_test",name:"Test Venue"},"p-x")'));
  check('restaurant promo detail has the favourite heart',
    /data-act="toggleFav"/.test(restDetail) && /heart_/.test(restDetail), restDetail.slice(0, 120));
  check('restaurant promo detail has a WhatsApp icon carrying data-promo',
    /data-act="waRestPromo"/.test(restDetail) && /data-promo="p-x"/.test(restDetail) && /whatsApp_icon_on/.test(restDetail));
  check('restaurant promo detail drops the full-width WA button', !/btn wa full/.test(restDetail));
  ev('if(window.__bof){EatoutsBridge.bundleOf=window.__bof;}');

  /* S2 reachability: the promos grid is the only path to openRestPromo. */
  ev('window.__bof2=null;' +
     'if(window.EatoutsBridge&&EatoutsBridge.bundleOf){window.__bof2=EatoutsBridge.bundleOf;' +
     'EatoutsBridge.bundleOf=function(){return {promos:{"Monday":[{id:"p-x",title:"Combo Deal",price:50,was:80,save:30,valid:"Mon",desc:"Test deal",items:["Drink"]}]}};};}')
  const promosView = String(ev('renderRestaurantPromos({id:"rest_test",name:"Test Venue"})'));
  check('restaurant promos grid wires openRestPromo',
    /data-act="openRestPromo"/.test(promosView) && /data-promo="p-x"/.test(promosView), promosView.slice(0, 160));
  ev('if(window.__bof2){EatoutsBridge.bundleOf=window.__bof2;}');

  /* S2 reachability: the Promos row button targets the promos view. */
  ev('window.__bof3=EatoutsBridge.bundleOf;EatoutsBridge.bundleOf=function(){return {promos:{"Monday":[{id:"p-x"}]}};};');
  const restOpts = String(ev('restaurantOptions({brandKey:"rest_test",name:"Test Venue",locationCount:1,branches:[{id:"rest_test",location:{town:"Gaborone",area:"CBD"}}]},null)'));
  check('Promos row button targets the promos view',
    /data-view="promos"/.test(restOpts) && !/data-act="openRestGallery"/.test(restOpts), restOpts.slice(0, 200));
  ev('EatoutsBridge.bundleOf=window.__bof3;');

  /* event lineup (renderPromoLink) card */
  ev('window.__pById=promoById;window.__evFor=eventFor;' +
     'promoById=function(id){return {promo:{id:id,title:"Tournament",brand:"Test Venue"},day:"Monday",restaurant:null};};' +
     'eventFor=function(){return {id:"ev-x",name:"Live Band",time:"20:00",sponsor:"Acme",desc:"A night",highlights:["Music"]};};' +
     'state.promoId="p-link";');
  const lineup = String(ev('renderPromoLink()'));
  check('event lineup has the favourite heart',
    /data-act="toggleFav"/.test(lineup) && /heart_/.test(lineup), lineup.slice(0, 120));
  check('event lineup has a WhatsApp icon carrying data-ev',
    /data-act="waEvent"/.test(lineup) && /data-ev="ev-x"/.test(lineup) && /whatsApp_icon_on/.test(lineup));
  check('event lineup drops the full-width WA button', !/btn wa full/.test(lineup));
  ev('promoById=window.__pById;eventFor=window.__evFor;');

  /* Promos FEED event cards (renderFeaturedCard + renderEventCard) now use the
     shared .ico-row split: heart left, WhatsApp on-icon right. */
  const feat = String(ev('renderFeaturedCard(FEATURED_EVENTS[0])'));
  check('featured feed card has the favourite heart',
    /data-act="toggleFav"/.test(feat) && /heart_/.test(feat), feat.slice(0, 120));
  check('featured feed card WhatsApp carries waFeatEvent + data-ev',
    /data-act="waFeatEvent"/.test(feat) && /data-ev="amapiano-fest"/.test(feat) && /whatsApp_icon_on/.test(feat));
  check('featured feed card drops the full-width WA button', !/btn wa full/.test(feat));
  check('featured feed card uses the ico-row split wrapper', /ico-row split/.test(feat));

  const featPoetry = String(ev('renderFeaturedCard(FEATURED_EVENTS.filter(function(e){return e.poetry;})[0])'));
  check('poetry feed card keeps waPoetry with no data-ev',
    /data-act="waPoetry"/.test(featPoetry) && !/data-ev=/.test(featPoetry), featPoetry.slice(0, 120));
  check('poetry feed card has the favourite heart and drops the full-width WA button',
    /data-act="toggleFav"/.test(featPoetry) && !/btn wa full/.test(featPoetry));

  const feedEv = String(ev('renderEventCard({id:"ev-y",name:"Live Band",time:"20:00",sponsor:"Acme",desc:"A night",highlights:["Music"]},0,null)'));
  check('feed event card has the favourite heart',
    /data-act="toggleFav"/.test(feedEv) && /heart_/.test(feedEv), feedEv.slice(0, 120));
  check('feed event card WhatsApp carries waEvent + data-ev',
    /data-act="waEvent"/.test(feedEv) && /data-ev="ev-y"/.test(feedEv) && /whatsApp_icon_on/.test(feedEv));
  check('feed event card drops the full-width WA button', !/btn wa full/.test(feedEv));

  /* Promo DETAIL page (renderPromoDetail): restaurant card + one-line
     heart · Back to Promos · WhatsApp action row. */
  ev('window.__pById3=promoById;' +
     'promoById=function(){return {promo:{id:"WED-FOOD-01",type:"Food",title:"Ribs",price:125,was:145,save:20,valid:"Wed",desc:"d",items:[]},day:"Wednesday",restaurant:{id:"rest_x",name:"The Yellow Giraffe",slug:"the-yellow-giraffe"}};};');
  const pdet = String(ev('renderPromoDetail()'));
  check('promo detail shows a restaurant card', /promo-venue-card/.test(pdet) && /class="rthumb"/.test(pdet));
  check('promo detail restaurant name navigates to the venue',
    /data-act="openPromoVenue"/.test(pdet) && /data-id="rest_x"/.test(pdet), pdet.slice(0, 200));
  check('promo detail shows the restaurant name', /The Yellow Giraffe/.test(pdet));
  check('promo detail has a one-line heart · Back to Promos · WhatsApp row',
    /ico-row split/.test(pdet) && /data-act="toggleFav"/.test(pdet) &&
    /data-act="backPromo"[^>]*>Back to Promos</.test(pdet) && /data-act="waPromo"/.test(pdet));
  check('promo detail drops the Save Summary button', !/savePromoSummary|Save Summary/.test(pdet));
  ev('promoById=window.__pById3;');

  /* bar/bottle promos have no restaurant venue - no card is drawn */
  ev('window.__pById4=promoById;' +
     'promoById=function(){return {promo:{id:"bevp-x",type:"Beverage",title:"Beer",price:0,was:0,valid:"Mon",desc:"d",items:[],brand:"Lager"},day:"Monday"};};');
  const pdetBar = String(ev('renderPromoDetail()'));
  check('bar promo detail draws no restaurant card', !/promo-venue-card/.test(pdetBar));
  check('bar promo detail still has the Back to Promos row', /data-act="backPromo"[^>]*>Back to Promos</.test(pdetBar));
  ev('promoById=window.__pById4;');

  /* legacy promos must still resolve while the bridge is live */
  check('legacy promo id resolves', !!evjSub('promoById("MON-FOOD-01")'));
  check('bar promo id resolves', !!evjSub('promoById("bevp-' + promoData.promotions[0].id + '")'));

  console.log('');
  if (errors.length) { console.log('window errors:'); errors.forEach(e => console.log('  ' + e)); fails += errors.length; }
  console.log(fails ? 'PROMO-CATS TEST FAILED (' + fails + ')' : 'PROMO-CATS TEST PASSED');
  process.exit(fails ? 1 : 0);
}, 400);

function evjSub(expr) {
  const out = window.eval('JSON.stringify(' + expr + ')');
  return JSON.parse(out);
}
