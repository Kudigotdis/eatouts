const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
const src = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
let html = src;
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
  const f = path.join(APP_DIR, s.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + s); return '<!-- missing ' + s + ' -->'; }
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
const type = (el, v) => {
  el.value = v;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const ev = s => window.eval(s);
const evj = s => JSON.parse(JSON.stringify(ev(s)));

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* ---------- A: header + phead ---------- */
  click(doc.querySelector('[data-tab="gallery"]'));
  check('header visible on Gallery', !doc.getElementById('hdr').classList.contains('hide'));
  check('no phead in gallery grid', !doc.querySelector('#viewport .phead'));

  /* ---------- C: categories, Timeline rename, tags ---------- */
  check('GALLERY_CATS', ev('GALLERY_CATS.join(",")') === 'All,Promos,Events,Food,Timeline', ev('GALLERY_CATS.join(",")'));
  check('Timeline items built', ev('GALLERY.filter(g=>g.cat==="Timeline").length') > 0, ev('GALLERY.filter(g=>g.cat==="Timeline").length'));
  check('no Gallery category left', ev('GALLERY.filter(g=>g.cat==="Gallery").length') === 0);
  check('default grid = demo pool', ev('JSON.stringify(filteredGallery().map(g=>g.id))') === ev('JSON.stringify(GALLERY.map(g=>g.id))'));
  check('default count line', ev('filteredGallery().length') === ev('GALLERY.length'));

  const tagged = evj('GALLERY.filter(g=>g.cat==="Events" && g.tags && g.tags.length>1).map(g=>g.tags)');
  check('featured event items carry their tags', tagged.length > 0, JSON.stringify(tagged).slice(0, 80));

  /* hashtag search on the default pool */
  const tag = tagged[0] && tagged[0][1];
  if (tag) {
    ev('state.gallerySearch=' + JSON.stringify(tag));
    const hits = evj('filteredGallery().map(g=>g.cat)');
    check('hashtag search "' + tag + '" returns rows', hits.length > 0, hits.length);
    check('hashtag search only tagged rows', ev('filteredGallery().every(g=>hay(g).indexOf(' + JSON.stringify(tag.toLowerCase().slice(1)) + ')>-1)'));
    ev('state.gallerySearch=""');
  } else { fails++; console.log('FAIL  no tagged event item to search with'); }

  /* ---------- scope: restaurant ---------- */
  const owners = evj('EatoutsBridge.promoOwners().map(r=>({id:r.id,name:r.name,town:(r.location||{}).town}))');
  const allRows = evj('EatoutsBridge.all().map(r=>({id:r.id,name:r.name,town:(r.location||{}).town}))');
  check('a promo-owning venue exists', owners.length > 0, owners.length);
  const defaultIds = evj('GALLERY.map(g=>g.id)');
  const defaultLen = defaultIds.length;

  const restA = owners[0].id;
  ev('state.galRest=' + JSON.stringify(restA) + ';state.galTown="All";state.galArea="All";');
  const idsA = evj('galleryScopeItems().map(g=>g.id)');
  const catsA = evj('galleryScopeItems().map(g=>g.cat)');
  check('restaurant scope differs from default', JSON.stringify(idsA) !== JSON.stringify(defaultIds), idsA.length + ' vs ' + defaultLen);
  check('restaurant scope has Promos', catsA.indexOf('Promos') > -1, JSON.stringify([...new Set(catsA)]));
  check('restaurant scope has Events', catsA.indexOf('Events') > -1);
  check('restaurant scope keeps Food + Timeline', catsA.indexOf('Food') > -1 && catsA.indexOf('Timeline') > -1);
  check('restaurant scope ids unique', new Set(idsA).size === idsA.length, idsA.length + ' vs ' + new Set(idsA).size);
  check('cbarKey carries galRest', ev('cbarKey()').indexOf(restA) > -1);

  const other = allRows.find(r => r.id !== restA);
  if (other) {
    ev('state.galRest=' + JSON.stringify(other.id));
    const idsB = evj('galleryScopeItems().map(g=>g.id)');
    check('second venue yields a different grid', JSON.stringify(idsB) !== JSON.stringify(idsA), idsB.length);
    check('second venue differs from demo pool', JSON.stringify(idsB) !== JSON.stringify(defaultIds));
  } else { fails++; console.log('FAIL  no second restaurant found'); }

  /* ---------- scope: location only ---------- */
  ev('state.galRest="All";state.galTown=' + JSON.stringify(owners[0].town || 'Gaborone') + ';state.galArea="All";');
  const locIds = evj('galleryScopeItems().map(g=>g.id)');
  check('location scope differs from demo pool', JSON.stringify(locIds) !== JSON.stringify(defaultIds));
  const photoCount = (items) => items.filter(g => g.cat === 'Food' || g.cat === 'Timeline').length;
  const locItems = evj('galleryScopeItems()');
  const defItems = evj('GALLERY');
  check('location scope slices the photo pool',
    photoCount(locItems) < photoCount(defItems),
    photoCount(locItems) + ' vs ' + photoCount(defItems));
  check('location scope keeps owner promos', evj('galleryScopeItems().map(g=>g.cat)').indexOf('Promos') > -1);
  ev('state.galTown="All"');

  /* ---------- category filter + counts ---------- */
  ev('state.galRest=' + JSON.stringify(restA) + ';state.galleryFilter="Promos";state.gallerySearch="";');
  const promosOnly = evj('filteredGallery().map(g=>g.cat)');
  check('Promos category = promos only', promosOnly.length > 0 && promosOnly.every(c => c === 'Promos'), JSON.stringify([...new Set(promosOnly)]));
  check('galleryCount matches filtered rows', ev('galleryCount("Promos")') === promosOnly.length, ev('galleryCount("Promos")'));
  ev('state.galleryFilter="All"');

  /* ---------- E: cbar ---------- */
  ev('render()');
  let vals = doc.querySelectorAll('#cbar .cbtn.gal-val');
  check('two cbar value buttons', vals.length === 2, vals.length);
  check('button names are aria labels',
    vals[0] && vals[0].getAttribute('aria-label') === 'Viewed Restaurant' &&
    vals[1] && vals[1].getAttribute('aria-label') === 'Gallery View Filter');
  check('viewed restaurant shows selected venue', vals[0] && vals[0].textContent.trim().length > 0, vals[0] && vals[0].textContent);
  check('filter button shows current category', vals[1] && vals[1].textContent.trim() === 'Gallery', vals[1] && vals[1].textContent);

  /* category listbox has 5 options */
  click(vals[1]);
  let opts = doc.querySelectorAll('#cbar .fpop [data-act="pickFilter"]');
  check('listbox shows 5 options', opts.length === 5, opts.length);
  check('listbox options', Array.from(opts).map(o => o.getAttribute('data-val')).join(',') === 'All,Promos,Events,Food,Timeline',
    Array.from(opts).map(o => o.getAttribute('data-val')).join(','));
  click(Array.from(opts).find(o => o.getAttribute('data-val') === 'Timeline'));
  let fb = doc.querySelectorAll('#cbar .cbtn.gal-val')[1];
  check('filter button shows the picked category', fb && fb.textContent.trim() === 'Timeline', fb && fb.textContent);
  check('grid filtered to Timeline', ev('filteredGallery().length>0') && ev('filteredGallery().every(g=>g.cat==="Timeline")'));
  check('listbox closes after picking', !doc.querySelector('#cbar .fpop [data-act="pickFilter"]'));
  ev('state.galleryFilter="All";render()');
  fb = doc.querySelectorAll('#cbar .cbtn.gal-val')[1];
  check('filter button reads Gallery when the filter is All', fb && fb.textContent.trim() === 'Gallery', fb && fb.textContent);
  check('state still stores All', ev('state.galleryFilter') === 'All');

  /* ---------- Viewed Restaurant popup ---------- */
  vals = doc.querySelectorAll('#cbar .cbtn.gal-val');
  click(vals[0]);
  check('viewed restaurant popup opens', !!doc.querySelector('#cbar .gal-rest-pop'));
  check('scrim is floating above', !!doc.querySelector('#cbar .fpop-scrim[data-act="closeGalRest"]'));
  const rowBtns = doc.querySelectorAll('#cbar .gal-locrow .cbtn');
  check('location row has Town | Area', rowBtns.length === 2 &&
    /Town/.test(rowBtns[0].textContent) && /Area/.test(rowBtns[1].textContent), rowBtns.length);
  check('live search sits above the list', !!doc.querySelector('#cbar #galRestSearch'));
  let rows = doc.querySelectorAll('#cbar [data-act="pickGalRest"]');
  check('A-Z restaurant list populated', rows.length > 1, rows.length);
  check('sticky All restaurants option', !!doc.querySelector('#cbar .loc-all[data-act="pickGalRest"]'));

  /* live search narrows the list */
  const target = rows[1].querySelector('span').textContent.split(' · ')[0].trim();
  type(doc.querySelector('#galRestSearch'), target);
  rows = doc.querySelectorAll('#cbar [data-act="pickGalRest"]');
  check('search narrows the list', rows.length >= 1 && rows.length < 20, rows.length + ' for "' + target + '"');
  type(doc.querySelector('#galRestSearch'), '');

  /* Town mode */
  click(doc.querySelectorAll('#cbar .gal-locrow .cbtn')[0]);
  check('town list replaces the restaurant list', doc.querySelectorAll('#cbar [data-act="pickGalTown"]').length > 1,
    doc.querySelectorAll('#cbar [data-act="pickGalTown"]').length);
  const townRow = doc.querySelector('#cbar [data-act="pickGalTown"]:not([data-town="All"])');
  const townName = townRow && townRow.getAttribute('data-town');
  click(townRow);
  check('picking a town keeps the popup open', !!doc.querySelector('#cbar .gal-rest-pop'));
  check('picking a town sets galTown', ev('state.galTown') === townName, ev('state.galTown') + ' vs ' + townName);
  check('picking a town returns to the restaurant list', ev('state.galLocMode') === 'rest' && !!doc.querySelector('#cbar [data-act="pickGalRest"]'));
  const afterTown = evj('filteredGallery().map(g=>g.id)');
  check('grid changed after the town pick', JSON.stringify(afterTown) !== JSON.stringify(defaultIds), afterTown.length);

  /* Area mode */
  click(doc.querySelectorAll('#cbar .gal-locrow .cbtn')[1]);
  const areaRows = doc.querySelectorAll('#cbar [data-act="pickGalArea"]');
  check('area list shows (areas or the no-data note)',
    areaRows.length > 0 || !!doc.querySelector('#cbar .fpop-note'), areaRows.length);
  check('back link shown in location mode', !!doc.querySelector('#cbar .gal-back'));

  /* back to the restaurant list, then pick a restaurant */
  click(doc.querySelector('#cbar .gal-back'));
  check('back link returns to the restaurant list', ev('state.galLocMode') === 'rest' && !!doc.querySelector('#cbar [data-act="pickGalRest"]'));
  const pickRow = doc.querySelector('#cbar [data-act="pickGalRest"]:not(.loc-all)');
  const pickId = pickRow.getAttribute('data-id');
  click(pickRow);
  check('picking a restaurant closes the popup', !doc.querySelector('#cbar .gal-rest-pop'));
  check('galRest applied', ev('state.galRest') === pickId, ev('state.galRest') + ' vs ' + pickId);
  const restGrid = evj('filteredGallery().map(g=>g.id)');
  check('grid now scoped to that restaurant', JSON.stringify(restGrid) !== JSON.stringify(afterTown), restGrid.length);
  check('viewed restaurant button shows the venue', /./.test(doc.querySelector('#cbar .cbtn.gal-val').textContent));

  /* photo view still works on scoped items */
  ev('state.galleryFilter="All";render()');
  const cell = doc.querySelector('#viewport [data-act="openPhoto"]');
  if (cell) {
    const cellId = cell.getAttribute('data-id');
    click(cell);
    check('photo view opens', ev('state.galleryView') === 'photo');
    check('photo view keeps the scoped set', evj('filteredGallery().map(g=>g.id)').length === restGrid.length);
    click(doc.querySelector('[data-act="backAlbum"]'));
    check('back to grid', ev('state.galleryView') === 'grid' && ev('state.galleryPhoto') === null);
  } else { fails++; console.log('FAIL  no gallery cell to open'); }

  /* ---------- F: rrow Promos -> Gallery ---------- */
  check('rrow Promos markup points at the Gallery', /data-act="openRestGallery"/.test(src));
  check('rrow Promos no longer opens the restaurant sub-view', !/data-view="promos"/.test(src));
  const ghost = doc.createElement('button');
  ghost.setAttribute('data-act', 'openRestGallery');
  ghost.setAttribute('data-id', restA);
  ghost.setAttribute('data-brand', restA);
  doc.body.appendChild(ghost);
  click(ghost);
  ghost.remove();
  check('rrow Promos lands on the Gallery tab', ev('state.tab') === 'gallery');
  check('rrow Promos preselects the Promos category', ev('state.galleryFilter') === 'Promos');
  check('rrow Promos scopes to the venue', ev('state.galRest') === restA, ev('state.galRest'));
  check('rrow Promos resets the photo view', ev('state.galleryView') === 'grid' && ev('state.galleryPhoto') === null);
  check('header still visible after the jump', !doc.getElementById('hdr').classList.contains('hide'));
  const filterBtn = doc.querySelectorAll('#cbar .cbtn.gal-val')[1];
  check('filter button reads Promos', filterBtn && filterBtn.textContent.trim() === 'Promos', filterBtn && filterBtn.textContent);

  /* ---------- G: About tab ---------- */
  click(doc.querySelector('[data-tab="about"]'));
  const vp = doc.getElementById('viewport');
  const btns = Array.from(vp.querySelectorAll('button'));
  const texts = btns.map(b => b.textContent.trim());
  check('Install EatOuts button present', texts.indexOf('Install EatOuts') > -1, JSON.stringify(texts));
  const blogLink = vp.querySelector('a[href="eatouts-blog.html"]');
  check('Blog link present', !!blogLink && blogLink.textContent.trim() === 'Blog', JSON.stringify(texts));
  check('Terms + Privacy still present', texts.indexOf('Terms of Service') > -1 && texts.indexOf('Privacy Policy') > -1);
  check('Operator still present', texts.indexOf('Operator') > -1);
  check('no Open Restaurant Gallery button', !vp.querySelector('[data-act="openAboutGallery"]'));
  check('no Send via WhatsApp button', texts.indexOf('Send via WhatsApp') < 0, JSON.stringify(texts));
  check('install button stubs a notice', !!vp.querySelector('button[data-act="showRestNotice"][data-notice*="APK"]'));
  check('blog stub button gone', !vp.querySelector('button[data-act="showRestNotice"][data-notice*="blog"]'));

  click(vp.querySelector('button[data-act="showRestNotice"][data-notice*="APK"]'));
  check('install notice shows', /APK/.test(ev('String(state.restNotice)')), ev('String(state.restNotice)'));
  check('notice renders in the DOM', /APK/.test(doc.getElementById('viewport').textContent), '');

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nGALLERY TEST PASSED' : '\nGALLERY TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);