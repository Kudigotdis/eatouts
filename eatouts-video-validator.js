/* ============================================================
   EATOUTS VIDEO VALIDATOR
   Client-side guard against oversized or excessively long video
   files, using only the native HTML5 <video> element.

   Usage:
     EatoutsVideoValidator.validate(file, 20, 60)
       .then(function(info){ ... })
       .catch(function(err){ ... });
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    maxSizeMB: 20,
    maxDurationSeconds: 60
  };

  function isVideo(file) {
    if (!file) return false;
    if (file.type && file.type.indexOf('video/') === 0) return true;
    return /\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv|3gp|3g2)$/i.test(file.name || '');
  }

  function makeError(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }

  function formatSeconds(s) {
    if (!isFinite(s) || s <= 0) return '0s';
    var total = Math.round(s);
    var m = Math.floor(total / 60);
    var sec = total % 60;
    if (m === 0) return sec + 's';
    return m + 'm ' + (sec < 10 ? '0' + sec : sec) + 's';
  }

  function formatMB(mb) {
    var n = Number(mb) || 0;
    if (n < 1) return (n * 1024).toFixed(0) + ' KB';
    return n.toFixed(1) + ' MB';
  }

  function readMetadata(file) {
    return new Promise(function (resolve, reject) {
      var url = null;
      var video = document.createElement('video');
      var settled = false;

      function cleanup() {
        if (settled) return;
        settled = true;
        video.removeAttribute('src');
        try { video.load(); } catch (e) {}
        if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
      }
      function fail(code, msg) {
        cleanup();
        reject(makeError(code, msg));
      }
      function ok(meta) {
        cleanup();
        resolve(meta);
      }

      try {
        url = URL.createObjectURL(file);
      } catch (e) {
        fail('no-metadata', 'Could not create a URL for this file.');
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      var timeout = setTimeout(function () {
        fail('no-metadata', 'Timed out reading video metadata — the file may be unsupported or too heavy.');
      }, 15000);

      video.addEventListener('loadedmetadata', function () {
        clearTimeout(timeout);
        var d = video.duration;
        if (!isFinite(d) || d <= 0) {
          fail('duration-read-failed', 'This video reports no duration — some formats (e.g. certain MKV/AVI) cannot be measured in the browser.');
          return;
        }
        ok({
          duration: d,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0
        });
      }, false);

      video.addEventListener('error', function () {
        clearTimeout(timeout);
        var code = video.error ? video.error.code : 0;
        var hint = code === 4
          ? 'This video format is not supported by your browser. Try MP4 (H.264) or WebM.'
          : 'Could not read the video file.';
        fail('no-metadata', hint);
      }, false);

      try {
        video.src = url;
        video.load();
      } catch (e) {
        clearTimeout(timeout);
        fail('no-metadata', 'Could not start reading the video.');
      }
    });
  }

  function validate(file, maxSizeMB, maxDurationSeconds) {
    var capMB = Number(maxSizeMB) > 0 ? Number(maxSizeMB) : DEFAULTS.maxSizeMB;
    var capSec = Number(maxDurationSeconds) > 0 ? Number(maxDurationSeconds) : DEFAULTS.maxDurationSeconds;
    var capBytes = capMB * 1024 * 1024;

    return new Promise(function (resolve, reject) {
      if (!file) { reject(makeError('not-a-video', 'No file provided.')); return; }
      if (!isVideo(file)) { reject(makeError('not-a-video', 'That is not a video file.')); return; }

      var size = file.size || 0;
      var sizeMB = size / (1024 * 1024);

      if (size > capBytes) {
        reject(makeError(
          'too-large',
          'Video is ' + formatMB(sizeMB) + '. The limit is ' + formatMB(capMB) + '. Please trim or compress it before uploading.'
        ));
        return;
      }

      readMetadata(file).then(function (meta) {
        if (meta.duration > capSec) {
          reject(makeError(
            'too-long',
            'Video is ' + formatSeconds(meta.duration) + '. The limit is ' + formatSeconds(capSec) + '. Please trim it before uploading.'
          ));
          return;
        }
        resolve({
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          size: size,
          sizeMB: sizeMB,
          type: file.type || '',
          name: file.name || ''
        });
      }).catch(function (err) {
        reject(err && err.code ? err : makeError('no-metadata', (err && err.message) || 'Could not read the video.'));
      });
    });
  }

  window.EatoutsVideoValidator = {
    DEFAULTS: DEFAULTS,
    validate: validate,
    isVideo: isVideo,
    formatSeconds: formatSeconds,
    formatMB: formatMB
  };
})();