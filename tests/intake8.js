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
  const { html, errors } = inline(fs.readFileSync(path.join(APP_DIR, 'intake.html'), 'utf8'));
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1/intake.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.localStorage.setItem('eatouts_session_v1', JSON.stringify({ restaurantId: 'r_demo', name: 'Demo' }));
      if (draft) w.localStorage.setItem('eatouts_intake_draft_v1', JSON.stringify(draft));
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

(async () => {
  /* ---------- boot + libs ---------- */
  const a = boot(null);
  const w = a.w, doc = a.doc;
  check('intake boot: no missing scripts', !a.errors.some(e => e.startsWith('missing script')), a.errors.join(' | '));
  check('nested app boot: no window errors', !a.errors.some(e => !e.startsWith('missing script')), a.errors.join(' | '));
  check('EatoutsImageCompressor loaded', !!(w.EatoutsImageCompressor && typeof w.EatoutsImageCompressor.compress === 'function'));
  check('EatoutsVideoValidator loaded', !!(w.EatoutsVideoValidator && typeof w.EatoutsVideoValidator.validate === 'function'));
  check('logo Upload button present', !!doc.querySelector('[data-act="uploadImage"][data-target="f_logo"]'));
  check('cover Upload button present', !!doc.querySelector('[data-act="uploadImage"][data-target="f_cover"]'));

  /* ---------- video validator rejects oversize deterministically ---------- */
  const bigVideo = new w.File([new w.Uint8Array(60 * 1024 * 1024)], 'big.mp4', { type: 'video/mp4' });
  let videoErr = null;
  try { await w.EatoutsVideoValidator.validate(bigVideo, 50, 300); }
  catch (e) { videoErr = e; }
  check('validator rejects a 60MB video against 50MB cap', !!videoErr && /50\.0 MB/.test(videoErr.message), videoErr && videoErr.message);
  check('validator rejects a non-video file', await w.EatoutsVideoValidator.validate(new w.File(['x'], 'a.txt', { type: 'text/plain' }), 50, 300).then(() => false).catch(() => true));

  /* ---------- logo upload path: compressor -> data URL -> bound input ---------- */
  w.EatoutsImageCompressor.compress = function () { return Promise.resolve(new w.Blob(['fake-webp'], { type: 'image/webp' })); };
  let fileInput = null;
  const createEl = doc.createElement.bind(doc);
  doc.createElement = function (tag) {
    const el = createEl(tag);
    if (String(tag).toLowerCase() === 'input') {
      el.click = function () { if (el.type === 'file') { fileInput = el; } };
    }
    return el;
  };
  doc.getElementById('f_logo').value = '';
  doc.querySelector('[data-act="uploadImage"][data-target="f_logo"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('picking logo creates a file input', !!fileInput && fileInput.accept === 'image/*');
  Object.defineProperty(fileInput, 'files', { value: [new w.File(['png'], 'logo.png', { type: 'image/png' })], configurable: true });
  fileInput.onchange();
  await sleep(60);
  const logoVal = doc.getElementById('f_logo').value;
  check('logo field receives a data URL', logoVal.startsWith('data:image/webp;base64,'), logoVal.slice(0, 40));

  /* draft was auto-saved with the uploaded logo + a seeded category/group */
  let draft = JSON.parse(w.localStorage.getItem('eatouts_intake_draft_v1'));
  check('upload persisted into the draft', draft.identity.logo.startsWith('data:image/webp'), draft.identity.logo.slice(0, 30));
  draft.menu.categories = [{ id: 'c1', name: 'Mains', items: [] }];
  draft.gallery.groups = [{ id: 'g1', title: 'Food', images: [] }];

  /* ---------- modal file fields (menu item + gallery image) ---------- */
  const b = boot(draft);
  const w2 = b.w, doc2 = b.doc;
  check('seeded boot: no window errors', b.errors.length === 0, b.errors.join(' | '));

  const addItem = doc2.querySelector('[data-act="addMenuItem"]');
  check('menu item button renders', !!addItem);
  addItem.dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
  const itemFile = doc2.querySelector('[data-file-for="image"]');
  const itemText = doc2.querySelector('input[name="image"]');
  check('menu item modal has a file picker', !!itemFile);
  check('menu item modal keeps the URL fallback field', !!itemText);

  const addImg = doc2.querySelector('[data-act="addGalImage"]');
  check('gallery image button renders', !!addImg);
  addImg.dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
  const galFile = doc2.querySelector('[data-file-for="src"]');
  const galText = doc2.querySelector('input[name="src"]');
  check('gallery modal has a file picker', !!galFile);
  check('gallery modal keeps the URL fallback field', !!galText);

  /* modal-picker path writes the data URL into the sibling text input */
  w2.EatoutsImageCompressor.compress = function () { return Promise.resolve(new w2.Blob(['fake-webp'], { type: 'image/webp' })); };
  Object.defineProperty(galFile, 'files', { value: [new w2.File(['png'], 'photo.png', { type: 'image/png' })], configurable: true });
  galFile.onchange();
  await sleep(60);
  check('gallery modal field receives a data URL', galText.value.startsWith('data:image/webp;base64,'), galText.value.slice(0, 40));

  /* modal URL fallback still saves when typed manually */
  galText.value = 'https://cdn.example.com/pic.jpg';
  galText.closest('.modal').querySelector('[data-save]').dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
  const draft2 = JSON.parse(w2.localStorage.getItem('eatouts_intake_draft_v1') || '{}');
  check('manual URL still saves via the fallback', (draft2.gallery && draft2.gallery.groups[0].images.length) === 1, JSON.stringify(draft2.gallery));

  console.log('');
  if (fails) { console.log('INTAKE TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('INTAKE TEST PASSED');
})();