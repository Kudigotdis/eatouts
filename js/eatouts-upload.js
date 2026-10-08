/* ============================================================
   EATOUTS UPLOAD
   Thin wiring layer over EatoutsImageCompressor and
   EatoutsVideoValidator: opens pickers, compresses images into
   data URLs, validates videos, and decorates URL fields with
   an "Upload" button.
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    maxVideoMB: 50,
    maxVideoSeconds: 300,
    imageAccept: 'image/*',
    videoAccept: 'video/*'
  };

  var FIELD_SELECTOR =
    'input[type="url"], input[data-upload], input[name="image"], ' +
    'input[name="src"], input[name="coverImage"], input[name="logo"], input[name="url"]';

  function isFn(v) { return typeof v === 'function'; }

  function makeError(msg) { return new Error('[EatoutsUpload] ' + msg); }

  function fail(onError, message) {
    var e = makeError(message);
    if (isFn(onError)) { onError(e); return; }
    throw e;
  }

  function options(o) {
    var src = o || {};
    var out = {};
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        out[k] = (src[k] != null ? src[k] : DEFAULTS[k]);
      }
    }
    out.label = src.label != null ? src.label : 'Upload';
    out.className = src.className != null ? src.className : 'btn btn-ghost btn-sm';
    out.selector = src.selector || FIELD_SELECTOR;
    out.onPick = src.onPick;
    out.onError = src.onError;
    out.onVideo = src.onVideo;
    return out;
  }

  function dispatchInput(el) {
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {
      try {
        var ev = document.createEvent('Event');
        ev.initEvent('input', true, false);
        el.dispatchEvent(ev);
      } catch (e2) { /* ignore */ }
    }
    try {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e3) { /* ignore */ }
  }

  function makePicker(o) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = o.imageAccept + ',' + o.videoAccept;
    inp.style.display = 'none';
    return inp;
  }

  function classify(file) {
    var ic = window.EatoutsImageCompressor;
    var vv = window.EatoutsVideoValidator;
    var isImage = ic && isFn(ic.isImage)
      ? !!ic.isImage(file)
      : /^image\//.test(file.type || '');
    var isVideo = vv && isFn(vv.isVideo)
      ? !!vv.isVideo(file)
      : /^video\//.test(file.type || '');
    return { isImage: isImage, isVideo: isVideo, ic: ic, vv: vv };
  }

  function handleFile(file, onPick, onError, onVideo, o) {
    if (!file) return;
    var kind = classify(file);

    if (kind.isImage) {
      if (!kind.ic || !isFn(kind.ic.compress)) {
        fail(onError, 'EatoutsImageCompressor is not loaded.');
        return;
      }
      kind.ic.compress(file, o.maxWidth, o.maxHeight, o.quality).then(function (blob) {
        return kind.ic.blobToDataURL(blob).then(function (dataUrl) {
          if (isFn(onPick)) {
            onPick(dataUrl, {
              name: file.name || '',
              originalSize: file.size || 0,
              compressedSize: blob.size || 0,
              type: blob.type || '',
              blob: blob
            });
          }
        });
      }).catch(function (e) {
        fail(onError, (e && e.message) || 'Image compression failed.');
      });
      return;
    }

    if (kind.isVideo) {
      if (!kind.vv || !isFn(kind.vv.validate)) {
        fail(onError, 'EatoutsVideoValidator is not loaded.');
        return;
      }
      kind.vv.validate(file, o.maxVideoMB, o.maxVideoSeconds).then(function (meta) {
        if (isFn(onVideo)) onVideo(meta);
        else if (isFn(onPick)) onPick(null, meta);
      }).catch(function (e) {
        fail(onError, (e && e.message) || 'Video validation failed.');
      });
      return;
    }

    fail(onError, 'Unsupported file type: ' + (file.type || file.name || 'unknown'));
  }

  function pickImage(onPick, onError, o) {
    var opts = options(o);
    if (!window.EatoutsImageCompressor && !window.EatoutsVideoValidator) {
      fail(onError, 'Neither EatoutsImageCompressor nor EatoutsVideoValidator is loaded.');
      return;
    }
    var inp = makePicker(opts);
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      handleFile(f, onPick, onError, opts.onVideo, opts);
    };
    inp.click();
  }

  function pickInto(inputEl, onError, o) {
    if (!inputEl) { fail(onError, 'pickInto requires an input element.'); return; }
    var opts = options(o);
    pickImage(function (dataUrl) {
      if (dataUrl == null) return;
      inputEl.value = dataUrl;
      dispatchInput(inputEl);
      if (isFn(opts.onPick)) opts.onPick(dataUrl);
    }, onError, opts);
  }

  function checkVideo(file, cb) {
    if (!file) {
      var e1 = makeError('No file provided.');
      if (isFn(cb)) cb(null, e1); else throw e1;
      return;
    }
    var vv = window.EatoutsVideoValidator;
    if (!vv || !isFn(vv.validate)) {
      var e2 = makeError('EatoutsVideoValidator is not loaded.');
      if (isFn(cb)) cb(null, e2); else throw e2;
      return;
    }
    if (isFn(vv.isVideo) && !vv.isVideo(file)) {
      var e3 = makeError('Not a video file.');
      if (isFn(cb)) cb(null, e3); else throw e3;
      return;
    }
    vv.validate(file, DEFAULTS.maxVideoMB, DEFAULTS.maxVideoSeconds).then(function (info) {
      if (isFn(cb)) cb(info);
    }).catch(function (err) {
      if (isFn(cb)) cb(null, err); else throw err;
    });
  }

  /* Attach the picker handler to a button element. Called for both
     buttons we create ourselves and pre-rendered buttons declared in
     the page markup (which come with a data-upload-for attribute). */
  function wireButton(btn, inputEl, opts) {
    btn.onclick = function (e) {
      if (e && isFn(e.preventDefault)) e.preventDefault();
      pickInto(inputEl, opts.onError, opts);
    };
  }

  function makeButton(inputEl, o) {
    var opts = options(o);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = opts.className;
    btn.textContent = opts.label;
    btn.setAttribute('data-upload-button', '1');
    wireButton(btn, inputEl, opts);
    return btn;
  }

  /* Look for a pre-rendered Upload button already sitting next to the
     input. The onboarding pages declare these as
       <button data-upload-for="<key>">Upload</button>
     so decorate() can wire the existing one instead of inserting a
     duplicate. Matches by input `name`, `data-k`, `data-field`, id,
     or — when the parent holds only one such button — unconditionally. */
  function findExistingButton(inputEl) {
    if (!inputEl.parentNode) return null;
    var buttons = inputEl.parentNode.querySelectorAll('[data-upload-for]');
    if (!buttons.length) return null;
    if (buttons.length === 1) return buttons[0];
    var identifiers = [
      inputEl.getAttribute('name'),
      inputEl.getAttribute('data-k'),
      inputEl.getAttribute('data-field'),
      inputEl.getAttribute('data-upload-for'),
      inputEl.id
    ];
    for (var i = 0; i < identifiers.length; i++) {
      var id = identifiers[i];
      if (!id) continue;
      for (var j = 0; j < buttons.length; j++) {
        if (buttons[j].getAttribute('data-upload-for') === id) return buttons[j];
      }
    }
    return null;
  }

  function decorate(container, o) {
    if (!container) return;
    var opts = options(o);
    var fields = container.querySelectorAll(opts.selector);
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      if (!el) continue;
      if (el.getAttribute('data-upload-wired') === '1') continue;
      if (el.type === 'file') continue;

      var existing = findExistingButton(el);
      if (existing) {
        wireButton(existing, el, opts);
      } else {
        var btn = makeButton(el, opts);
        if (el.parentNode) el.parentNode.insertBefore(btn, el.nextSibling);
      }
      el.setAttribute('data-upload-wired', '1');
    }
  }

  window.EatoutsUpload = {
    DEFAULTS: DEFAULTS,
    pickImage: pickImage,
    pickInto: pickInto,
    checkVideo: checkVideo,
    makeButton: makeButton,
    decorate: decorate
  };
})();