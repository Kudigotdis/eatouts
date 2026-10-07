/* ============================================================
   EATOUTS IMAGE COMPRESSOR
   Client-side image compression using the native Canvas API.
   No npm dependencies, no bundler, no external services.

   Usage (vanilla JS, global):
     EatoutsImageCompressor.compress(file, 1600, 1600, 0.82)
       .then(function(blob){ ... })       // blob is image/webp
       .catch(function(err){ ... });
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    mimeType: 'image/webp'
  };

  function supportsWebP() {
    if (supportsWebP._cached !== undefined) return supportsWebP._cached;
    var c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    var ok = false;
    try {
      var test = c.toDataURL('image/webp');
      ok = test.indexOf('data:image/webp') === 0;
    } catch (e) { ok = false; }
    supportsWebP._cached = ok;
    return ok;
  }

  function isImage(file) {
    if (!file) return false;
    if (file.type && file.type.indexOf('image/') === 0) return true;
    return /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i.test(file.name || '');
  }

  function toErrorMessage(err) {
    if (!err) return 'Unknown image error';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    return String(err);
  }

  function loadBitmap(file) {
    if (typeof createImageBitmap !== 'function') {
      return Promise.reject(new Error('createImageBitmap unavailable'));
    }
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .catch(function () { return createImageBitmap(file); });
  }

  function loadImageElement(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try { URL.revokeObjectURL(url); } catch (e) {}
        resolve(img);
      };
      img.onerror = function () {
        try { URL.revokeObjectURL(url); } catch (e) {}
        reject(new Error('Could not decode image — the file may be corrupt or an unsupported format (HEIC?).'));
      };
      img.src = url;
    });
  }

  function fitWithin(w, h, maxW, maxH) {
    if (!w || !h) return { width: maxW, height: maxH, scale: 1 };
    var scale = Math.min(maxW / w, maxH / h);
    if (scale >= 1) return { width: w, height: h, scale: 1 };
    return {
      width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)),
      scale: scale
    };
  }

  function encodeCanvas(canvas, mimeType, quality) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob !== 'function') {
        reject(new Error('Canvas.toBlob unavailable in this browser.'));
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error('Image encoding failed — the canvas produced no blob.'));
          return;
        }
        if (mimeType === 'image/webp' && blob.type !== 'image/webp') {
          canvas.toBlob(function (jpegBlob) {
            if (!jpegBlob) {
              reject(new Error('Image encoding failed and JPEG fallback also failed.'));
              return;
            }
            jpegBlob._usedFallback = true;
            resolve(jpegBlob);
          }, 'image/jpeg', quality);
          return;
        }
        resolve(blob);
      }, mimeType, quality);
    });
  }

  function compress(file, maxWidth, maxHeight, quality) {
    return compressDetailed(file, maxWidth, maxHeight, quality).then(function (res) {
      return res.blob;
    });
  }

  function compressDetailed(file, maxWidth, maxHeight, quality) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('No file provided.')); return; }
      if (!isImage(file)) { reject(new Error('Not an image file.')); return; }

      var maxW = Math.max(1, Math.floor(maxWidth || DEFAULTS.maxWidth));
      var maxH = Math.max(1, Math.floor(maxHeight || DEFAULTS.maxHeight));
      var q = Math.min(1, Math.max(0.05, Number(quality) || DEFAULTS.quality));

      var wantsWebP = supportsWebP();
      var mimeType = wantsWebP ? 'image/webp' : 'image/jpeg';

      var decode = loadBitmap(file).catch(function () {
        return loadImageElement(file);
      });

      decode.then(function (source) {
        var srcW = source.width || source.naturalWidth || 0;
        var srcH = source.height || source.naturalHeight || 0;
        if (!srcW || !srcH) {
          reject(new Error('Image has no dimensions — file may be empty or corrupt.'));
          return;
        }

        var fit = fitWithin(srcW, srcH, maxW, maxH);

        var canvas = document.createElement('canvas');
        canvas.width = fit.width;
        canvas.height = fit.height;

        var ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not acquire 2D context.')); return; }

        if (!wantsWebP) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';

        try {
          ctx.drawImage(source, 0, 0, fit.width, fit.height);
        } catch (e) {
          reject(new Error('Could not draw image onto canvas: ' + toErrorMessage(e)));
          return;
        }

        if (typeof source.close === 'function') source.close();

        encodeCanvas(canvas, mimeType, q).then(function (blob) {
          var usedFallback = !!blob._usedFallback;
          var finalType = blob.type || mimeType;
          var originalSize = file.size || 0;
          var compressedSize = blob.size || 0;
          var ratio = originalSize ? (compressedSize / originalSize) : 0;

          canvas.width = 0;
          canvas.height = 0;

          resolve({
            blob: blob,
            width: fit.width,
            height: fit.height,
            originalWidth: srcW,
            originalHeight: srcH,
            originalSize: originalSize,
            compressedSize: compressedSize,
            ratio: ratio,
            savedBytes: Math.max(0, originalSize - compressedSize),
            type: finalType,
            usedFallback: usedFallback,
            quality: q
          });
        }).catch(function (err) {
          canvas.width = 0;
          canvas.height = 0;
          reject(err);
        });
      }).catch(function (err) {
        reject(new Error(toErrorMessage(err)));
      });
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read blob as data URL.')); };
      r.readAsDataURL(blob);
    });
  }

  function formatBytes(bytes) {
    var b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  window.EatoutsImageCompressor = {
    DEFAULTS: DEFAULTS,
    compress: compress,
    compressDetailed: compressDetailed,
    supportsWebP: supportsWebP,
    isImage: isImage,
    blobToDataURL: blobToDataURL,
    formatBytes: formatBytes
  };
})();