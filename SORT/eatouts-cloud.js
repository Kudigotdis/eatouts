/* ============================================================
   EATOUTS CLOUD
   One client for every cloud operation. Talks to a Cloudflare
   Worker that fronts an R2 bucket. Falls back gracefully when
   the Worker URL isn't configured yet, so pages keep working
   during development and after the switch.

   Exposes: window.EatoutsCloud
   ============================================================ */
(function(){
  'use strict';

  /* ------------------------------------------------------------
     CONFIG
     Fill these in AFTER you set up Cloudflare. Until then, every
     cloud method returns a "not configured" result and callers
     fall back to local behaviour.
     ------------------------------------------------------------ */
  window.EATOUTS_CLOUD = window.EATOUTS_CLOUD || {
    /* e.g. 'https://eatouts-media.YOUR-NAME.workers.dev' */
    workerUrl: '',
    /* a shared secret you paste here AND into the Worker settings.
       Not real security — just keeps random traffic off your bucket.
       Fine for a prototype with under a few hundred users. */
    secret: '',
    /* which bucket paths this client is allowed to touch */
    paths: {
      suppliers: 'suppliers',
      supplierImages: 'supplier-images',
      blog: 'blog',
      events: 'events'
    }
  };

  /* ---------- helpers ---------- */
  function esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function uid(p){ return (p||'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
  function slugify(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  function isConfigured(){
    return !!String(window.EATOUTS_CLOUD.workerUrl || '').trim();
  }
  function workerUrl(){
    return String(window.EATOUTS_CLOUD.workerUrl || '').replace(/\/+$/,'');
  }
  function secret(){
    return String(window.EATOUTS_CLOUD.secret || '');
  }

  function withSecret(headers){
    headers = headers || {};
    if (secret()) headers['X-Eatouts-Secret'] = secret();
    return headers;
  }

  /* ============================================================
     UPLOAD — a file (Blob/File) or raw text
     ============================================================ */
  function upload(path, data, opts){
    opts = opts || {};
    if (!isConfigured()) {
      return Promise.resolve({ ok:false, reason:'not-configured' });
    }
    if (!path) return Promise.reject(new Error('Upload path is required'));

    var body;
    var headers = withSecret();
    if (typeof data === 'string') {
      headers['Content-Type'] = opts.contentType || 'text/plain';
      body = data;
    } else if (data instanceof Blob) {
      headers['Content-Type'] = opts.contentType || data.type || 'application/octet-stream';
      body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    var url = workerUrl() + '/upload?path=' + encodeURIComponent(path);

    return fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    })
    .then(function(r){
      if (!r.ok) throw new Error('Upload failed: HTTP ' + r.status);
      return r.json();
    })
    .then(function(json){
      if (!json || !json.url) throw new Error('Upload returned no URL');
      return { ok:true, url:json.url, path:json.path || path };
    })
    .catch(function(err){
      console.warn('[EatoutsCloud] upload failed', err);
      return { ok:false, reason:'error', error:err.message };
    });
  }

  /* ============================================================
     FETCH — JSON from the bucket
     ============================================================ */
  function fetchJson(path, fallbackUrl){
    /* Even when the cloud isn't configured, we try the fallbackUrl
       (the static JSON committed in the repo). If that fails too,
       callers see null and can use their own cache. */
    if (!isConfigured()) {
      return fallbackUrl ? fetchFallback(fallbackUrl) : Promise.resolve(null);
    }

    var url = workerUrl() + '/json?path=' + encodeURIComponent(path);
    return fetch(url, { headers: withSecret() })
      .then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(json){ return json; })
      .catch(function(){
        /* Cloud is set up but down, or the file doesn't exist yet.
           Quietly fall back to the static file. */
        return fallbackUrl ? fetchFallback(fallbackUrl) : null;
      });
  }

  function fetchFallback(url){
    if (!window.fetch) return Promise.resolve(null);
    return fetch(url, { cache:'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .catch(function(){ return null; });
  }

  /* ============================================================
     DOMAIN HELPERS — thin wrappers, one per data type
     ============================================================ */

  /* ----- Suppliers ----- */
  function publishSupplier(profile){
    var slug = profile.slug || slugify(profile.business && profile.business.name || 'supplier') || 'supplier';
    var path = (window.EATOUTS_CLOUD.paths.suppliers || 'suppliers') + '/' + slug + '.json';
    profile.updatedAt = Date.now();
    return upload(path, profile, { contentType:'application/json' })
      .then(function(res){
        return Object.assign({}, res, { slug:slug, path:path });
      });
  }
  function listSuppliers(){
    var fallback = 'assets/data/suppliers.json';
    return fetchJson('suppliers/_index.json', fallback)
      .then(function(json){
        if (!json) return [];
        return Array.isArray(json.suppliers) ? json.suppliers : [];
      });
  }
  function supplierImage(file, slug){
    var path = (window.EATOUTS_CLOUD.paths.supplierImages || 'supplier-images')
      + '/' + slug + '-' + Date.now() + '-' + Math.floor(Math.random()*10000) + guessExt(file);
    return upload(path, file, { contentType: file.type || 'image/jpeg' });
  }
  function guessExt(file){
    var n = (file && file.name) || '';
    var m = n.match(/\.([a-z0-9]+)$/i);
    return m ? '.' + m[1].toLowerCase() : '.bin';
  }

  /* ----- Blog ----- */
  function publishBlogFeed(feed){
    feed = feed || {};
    feed.generatedAt = new Date().toISOString();
    return upload('blog/posts.json', feed, { contentType:'application/json' });
  }
  function fetchBlogFeed(){
    return fetchJson('blog/posts.json', 'assets/data/blog_posts.json');
  }

  /* ----- Events ----- */
  function publishEvent(event){
    if (!event || !event.id) return Promise.reject(new Error('Event needs an id'));
    var path = (window.EATOUTS_CLOUD.paths.events || 'events') + '/' + event.id + '.json';
    return upload(path, event, { contentType:'application/json' });
  }
  function fetchEvents(){
    return fetchJson('events/_index.json', 'assets/data/events.json');
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  window.EatoutsCloud = {
    isConfigured: isConfigured,
    upload: upload,
    fetchJson: fetchJson,
    slugify: slugify,
    uid: uid,

    /* domain helpers */
    publishSupplier: publishSupplier,
    listSuppliers: listSuppliers,
    supplierImage: supplierImage,

    publishBlogFeed: publishBlogFeed,
    fetchBlogFeed: fetchBlogFeed,

    publishEvent: publishEvent,
    fetchEvents: fetchEvents
  };
})();