/* ============================================================
   EATOUTS BLOG ENGINE
   Composer + reader for the EatOuts blog. Runs entirely in
   the browser. Public feed lives at assets/data/blog_posts.json.
   Admin drafts live in localStorage under eatouts_blog_v1.

   Exposes: window.EatoutsBlog
   Optional deps (auto-detected, all graceful if missing):
     EatoutsAuth   — to gate admin mode
     EatoutsBrand  — for slugify
     EatoutsCloud  — to publish the feed to Cloudflare
   ============================================================ */
(function(){
  'use strict';

  var STORE_KEY  = 'eatouts_blog_v1';
  var CACHE_KEY  = 'eatouts_blog_cache_v1';
  var FEED_PATH  = 'assets/data/blog_posts.json';
  var AUTOSAVE_MS = 2500;
  var MAX_POSTS   = 200;
  var MAX_BLOCKS  = 40;
  /* durability limits (grafted from eatouts-blog-engine.js) */
  var VERSION_LIMIT    = 10;            /* saved snapshots kept per post */
  var POST_JSON_LIMIT  = 200 * 1024;    /* 200 KB per post */
  var STORE_BYTES_LIMIT = 4 * 1024 * 1024; /* drop history before failing saves */

  var BLOCK_TYPES = [
    { type:'heading',    name:'Heading',     icon:'H' },
    { type:'subheading', name:'Sub-heading', icon:'h' },
    { type:'text',       name:'Text',        icon:'¶' },
    { type:'image',      name:'Image',       icon:'🖼' },
    { type:'gallery',    name:'Gallery',     icon:'⊞' },
    { type:'video',      name:'Video',       icon:'▶' },
    { type:'link',       name:'Link',        icon:'🔗' },
    { type:'divider',    name:'Divider',     icon:'―' },
    { type:'quote',      name:'Quote',       icon:'❝' },
    { type:'list',       name:'List',        icon:'•' },
    { type:'callout',    name:'Callout',     icon:'!' }
  ];

  /* ============================================================
     HELPERS
     ============================================================ */
  function esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function uid(p){ return (p||'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
  function slugify(s){
    if (window.EatoutsBrand && typeof EatoutsBrand.slugify === 'function') return EatoutsBrand.slugify(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function formatDate(ts){
    if (!ts) return '';
    var d = new Date(ts);
    var months = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function readTime(post){
    var words = 0;
    (post.blocks||[]).forEach(function(b){
      if (b.text) words += String(b.text).split(/\s+/).length;
      if (Array.isArray(b.items)) words += b.items.join(' ').split(/\s+/).length;
    });
    return Math.max(1, Math.round(words / 200));
  }
  function toast(m){
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = m; t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ t.classList.remove('on'); }, 2000);
  }

  /* ============================================================
     STORAGE
     ============================================================ */
  function loadStore(){
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { version:1, posts:[], redirects:{}, history:{} };
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.posts)) return { version:1, posts:[], redirects:{}, history:{} };
      parsed.redirects = parsed.redirects || {};
      parsed.history = parsed.history || {};
      return parsed;
    } catch(e){
      console.warn('[blog] store unreadable', e);
      return { version:1, posts:[], redirects:{}, history:{} };
    }
  }
  function saveStore(store){
    try {
      var json = JSON.stringify(store);
      /* Storage safety: shed version history before risking a write failure */
      if (json.length > STORE_BYTES_LIMIT && store.history && Object.keys(store.history).length) {
        store.history = {};
        json = JSON.stringify(store);
      }
      localStorage.setItem(STORE_KEY, json); return true;
    }
    catch(e){ console.warn('[blog] save failed', e); toast('Save failed — storage full'); return false; }
  }
  function allPosts(){
    return loadStore().posts.slice().sort(function(a,b){
      return (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0);
    });
  }
  function publishedPosts(){
    return allPosts().filter(function(p){ return p.status === 'published'; });
  }
  function findPost(idOrSlug){
    var list = allPosts();
    for (var i=0;i<list.length;i++){
      if (list[i].id === idOrSlug || list[i].slug === idOrSlug) return list[i];
    }
    return null;
  }
  function upsertPost(post){
    var store = loadStore();
    var found = false;
    for (var i=0;i<store.posts.length;i++){
      if (store.posts[i].id === post.id) { store.posts[i] = post; found = true; break; }
    }
    if (!found) store.posts.push(post);
    if (store.posts.length > MAX_POSTS) store.posts = store.posts.slice(-MAX_POSTS);
    saveStore(store);
    rebuildTagIndex();
  }
  function deletePost(id){
    var store = loadStore();
    store.posts = store.posts.filter(function(p){ return p.id !== id; });
    if (store.history) delete store.history[id];
    saveStore(store);
    rebuildTagIndex();
  }
  function makeSlugUnique(base, ignoreId){
    var s = slugify(base) || 'post';
    var taken = {};
    allPosts().forEach(function(p){ if (p.id !== ignoreId) taken[p.slug] = true; });
    if (!taken[s]) return s;
    var n = 2;
    while (taken[s + '-' + n]) n++;
    return s + '-' + n;
  }

  /* ============================================================
     POST RESOLUTION (store first, cached feed as fallback)
     ============================================================ */
  function resolvePost(slug){
    if (!slug) return null;
    var post = findPost(slug);
    if (post) return post;
    var cached = loadCachedFeed();
    if (cached && cached.posts) {
      for (var i=0;i<cached.posts.length;i++){
        if (cached.posts[i].slug === slug) return cached.posts[i];
      }
    }
    return null;
  }

  /* ============================================================
     OPEN GRAPH (grafted from eatouts-blog-engine.js)
     Fills the og:/twitter: meta placeholders when a post view is
     open so WhatsApp/share previews show the real title + image.
     ============================================================ */
  var DEFAULT_DOC_TITLE = null;
  function applyOgTags(post){
    var head = document.getElementsByTagName('head')[0];
    if (!head) return;
    var set = function(name, content){
      var m = head.querySelector('meta[property="'+name+'"],meta[name="'+name+'"]');
      if (!m){
        m = document.createElement('meta');
        if (name.indexOf('og:') === 0) m.setAttribute('property', name);
        else m.setAttribute('name', name);
        head.appendChild(m);
      }
      m.setAttribute('content', content || '');
    };
    var title = post && post.title ? post.title : 'EatOuts Blog';
    var desc = post && post.subtitle ? post.subtitle
      : (post && post.blocks && post.blocks[0] && post.blocks[0].text
          ? String(post.blocks[0].text).slice(0, 155)
          : "Stories, guides, and honest updates from Botswana's restaurant scene.");
    var url = post && post.slug ? postUrl(post.slug) : window.location.href.split('#')[0];
    var image = post && post.coverImage ? post.coverImage : '';

    set('title', title);
    set('og:title', title);
    set('description', desc);
    set('og:description', desc);
    set('og:type', 'article');
    set('og:url', url);
    set('og:image', image);
    set('twitter:card', image ? 'summary_large_image' : 'summary');
    set('twitter:title', title);
    set('twitter:description', desc);
    set('twitter:image', image);
    if (DEFAULT_DOC_TITLE) document.title = title + ' · EatOuts Blog';
  }
  function clearOgTags(){
    var head = document.getElementsByTagName('head')[0];
    if (!head) return;
    ['title','og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image']
      .forEach(function(name){
        var m = head.querySelector('meta[property="'+name+'"],meta[name="'+name+'"]');
        if (m) m.parentNode.removeChild(m);
      });
    if (DEFAULT_DOC_TITLE) document.title = DEFAULT_DOC_TITLE;
  }

  /* ============================================================
     TAG DEEP LINKS  #tag-<tag-slug>  (grafted behaviour)
     ============================================================ */
  function readTagFromHash(){
    var h = window.location.hash || '';
    if (h.indexOf('#tag-') === 0) {
      var s = h.slice(5).replace(/[^a-z0-9\-]/g, '').toLowerCase();
      return TAG_INDEX[s] || '';
    }
    return '';
  }
  function setTagHash(tag){
    var want = tag ? '#tag-' + slugify(tag) : '';
    var have = window.location.hash || '';
    if (have === want) return;
    if (want) window.location.hash = want;
    else if (have) window.location.hash = '';
  }

  /* ============================================================
     VERSION HISTORY (grafted from eatouts-blog-admin.js)
     ============================================================ */
  function snapshot(post){
    if (!post || !post.id) return;
    var store = loadStore();
    if (!store.history) store.history = {};
    var hist = store.history[post.id] || [];
    hist.push({
      at: Date.now(),
      title: post.title, slug: post.slug, subtitle: post.subtitle,
      coverImage: post.coverImage, coverCaption: post.coverCaption,
      tags: (post.tags || []).slice(),
      blocks: JSON.parse(JSON.stringify(post.blocks || [])),
      status: post.status, publishedAt: post.publishedAt
    });
    if (hist.length > VERSION_LIMIT) hist = hist.slice(hist.length - VERSION_LIMIT);
    store.history[post.id] = hist;
    saveStore(store);
  }
  function postHistory(post){
    if (!post || !post.id) return [];
    var store = loadStore();
    return (store.history && store.history[post.id]) || [];
  }
  function renderVersionList(post){
    var hist = postHistory(post);
    if (!hist.length) return '';
    var h = '<div style="margin-top:22px">';
    h += '<div style="margin-bottom:10px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#a89a7e;font-weight:800">Previous versions</div>';
    h += '<div style="max-height:220px;overflow-y:auto;border:1px solid #ece7db;border-radius:10px;background:#fff">';
    for (var i = hist.length - 1; i >= 0; i--) {
      var v = hist[i];
      h += '<div style="display:flex;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #f4efe4">' +
        '<span style="flex:0 0 auto;font-size:11px;color:#a89a7e;font-weight:700">' + (i+1) + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:800;color:#1b1b1b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(v.title || '(no title)') + '</div>' +
          '<div style="font-size:11px;color:#a89a7e">' + esc(formatDate(v.at)) + ' · ' + (v.status === 'published' ? 'published' : 'draft') + '</div>' +
        '</div>' +
        '<button class="btn ghost sm" data-act="restoreVer" data-i="' + i + '">Restore</button>' +
      '</div>';
    }
    h += '</div></div>';
    return h;
  }

  /* ============================================================
     PUBLIC FEED
     ============================================================ */
  function loadCachedFeed(){
    try { var r = localStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : null; }
    catch(e){ return null; }
  }
  function saveCachedFeed(feed){
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(feed)); }
    catch(e){ console.warn('[blog] cache too big', e); }
  }
  function fetchFeed(){
    if (window.EatoutsCloud && EatoutsCloud.isConfigured && EatoutsCloud.isConfigured()) {
      return EatoutsCloud.fetchBlogFeed()
        .then(function(feed){
          if (feed && Array.isArray(feed.posts)) { saveCachedFeed(feed); return feed; }
          return loadCachedFeed() || localFeedOrNull();
        })
        .catch(function(){ return loadCachedFeed() || localFeedOrNull(); });
    }
    if (!window.fetch) return Promise.resolve(localFeedOrNull());
    return fetch(FEED_PATH, { cache:'no-store' })
      .then(function(r){ if (!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(feed){
        if (feed && Array.isArray(feed.posts)) { saveCachedFeed(feed); return feed; }
        return null;
      })
      .catch(function(){ return loadCachedFeed() || localFeedOrNull(); });
  }
  function localFeedOrNull(){
    var stored = loadStore();
    if (stored.posts.length) {
      return {
        generatedAt: Date.now(),
        postCount: stored.posts.filter(function(p){ return p.status==='published'; }).length,
        posts: stored.posts.filter(function(p){ return p.status==='published'; })
      };
    }
    return null;
  }
  function bootstrapFromFeed(feed){
    /* If the local store is empty and we got a public feed, seed it in
       so the admin can start editing those posts. */
    var store = loadStore();
    if (store.posts.length) return false;
    if (!feed || !Array.isArray(feed.posts) || !feed.posts.length) return false;
    store.posts = feed.posts.map(function(p){
      if (!p.id) p.id = uid('post');
      if (!p.slug) p.slug = slugify(p.title||'post');
      if (!p.createdAt) p.createdAt = p.publishedAt || Date.now();
      if (!p.updatedAt) p.updatedAt = p.createdAt;
      return p;
    });
    saveStore(store);
    rebuildTagIndex();
    return true;
  }

  /* ============================================================
     STATE + ELS
     ============================================================ */
  var state = {
    view: 'timeline',   /* timeline | post | admin-list | admin-edit */
    postSlug: null,
    editId: null,
    admin: false,
    search: '',
    activeTag: '',
    draft: null,
    previewOpen: false,
    dirty: false
  };

  var els = {};
  var autosaveTimer = null;
  var TAG_INDEX = {};

  /* ============================================================
     INLINE FORMATTING + TAG INDEX
     ============================================================ */
  function rebuildTagIndex(){
    TAG_INDEX = {};
    allPosts().forEach(function(p){
      (p.tags||[]).forEach(function(t){ TAG_INDEX[slugify(t)] = t; });
    });
  }
  function formatInline(s){
    var t = esc(s);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/#([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)/gi, function(m, tag){
      var k = tag.toLowerCase();
      if (TAG_INDEX[k]) {
        return '<a class="tag-inline" data-act="tagJump" data-tag="' + esc(k) + '">#' + esc(tag) + '</a>';
      }
      return m;
    });
    return t;
  }

  /* ============================================================
     BLOCK RENDERING (public view)
     ============================================================ */
  function renderBlock(b){
    switch (b.type) {
      case 'heading':
        return '<h2 class="blk-heading">' + formatInline(b.text) + '</h2>';
      case 'subheading':
        return '<h3 class="blk-subheading">' + formatInline(b.text) + '</h3>';
      case 'text':
        return '<p class="blk-text">' + formatInline(b.text) + '</p>';
      case 'image':
        if (!b.src) return '';
        return '<figure class="blk-image">' +
          '<img loading="lazy" src="' + esc(b.src) + '" alt="' + esc(b.alt||'') + '">' +
          (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') +
        '</figure>';
      case 'gallery': {
        var imgs = (b.images || []).filter(function(im){ return im && im.src; });
        if (!imgs.length) return '';
        return '<div class="blk-gallery">' +
          imgs.map(function(im){ return '<img loading="lazy" src="' + esc(im.src) + '" alt="' + esc(im.alt||'') + '">'; }).join('') +
          (b.caption ? '<div style="grid-column:1/-1;font-size:11.5px;color:#a89a7e;text-align:center;padding-top:6px;font-style:italic">' + esc(b.caption) + '</div>' : '') +
        '</div>';
      }
      case 'video':
        if (!b.src) return '';
        return '<figure class="blk-video">' +
          '<video controls preload="metadata" playsinline' + (b.poster ? ' poster="' + esc(b.poster) + '"' : '') + '>' +
            '<source src="' + esc(b.src) + '">' +
          '</video>' +
          (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') +
        '</figure>';
      case 'link':
        if (!b.url) return '';
        return '<a class="blk-link" href="' + esc(b.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<b>' + esc(b.label || b.url) + '</b>' +
          (b.description ? '<span>' + esc(b.description) + '</span>' : '') +
        '</a>';
      case 'divider':
        return '<hr class="blk-divider">';
      case 'quote':
        return '<blockquote class="blk-quote">' +
          '<p>' + formatInline(b.text||'') + '</p>' +
          (b.attribution ? '<cite>' + esc(b.attribution) + '</cite>' : '') +
        '</blockquote>';
      case 'list': {
        var items = (b.items||[]).filter(function(x){ return String(x).trim(); });
        if (!items.length) return '';
        var tag = b.ordered ? 'ol' : 'ul';
        return '<' + tag + ' class="blk-list">' + items.map(function(i){ return '<li>' + formatInline(i) + '</li>'; }).join('') + '</' + tag + '>';
      }
      case 'callout': {
        var v = (b.variant === 'success' || b.variant === 'warning') ? b.variant : 'info';
        return '<div class="blk-callout ' + v + '">' + formatInline(b.text||'') + '</div>';
      }
      default:
        return '';
    }
  }
  function renderBlocks(blocks){
    return (blocks||[]).map(renderBlock).join('');
  }

  /* ============================================================
     POST URL
     ============================================================ */
  function postUrl(slug){
    var loc = window.location;
    return loc.origin + loc.pathname + '?post=' + encodeURIComponent(slug);
  }

  /* ============================================================
     TIMELINE VIEW
     ============================================================ */
  function renderTimeline(){
    var posts = publishedPosts();
    var q = state.search.trim().toLowerCase();
    var tag = state.activeTag;

    if (tag) posts = posts.filter(function(p){ return (p.tags||[]).indexOf(tag) > -1; });
    if (q) {
      var needles = q.split(/\s+/).filter(Boolean);
      posts = posts.filter(function(p){
        var hay = (p.title||'') + ' ' + (p.subtitle||'') + ' ' + (p.tags||[]).join(' ') + ' ' +
          (p.blocks||[]).map(function(b){
            return [b.text, b.caption, b.label, b.description].concat(b.items||[]).filter(Boolean).join(' ');
          }).join(' ');
        hay = hay.toLowerCase();
        return needles.every(function(n){ return hay.indexOf(n) > -1; });
      });
    }

    /* Tag strip */
    var tagCounts = {};
    publishedPosts().forEach(function(p){
      (p.tags||[]).forEach(function(t){ tagCounts[t] = (tagCounts[t]||0) + 1; });
    });
    var topTags = Object.keys(tagCounts).sort(function(a,b){ return tagCounts[b]-tagCounts[a]; }).slice(0, 20);

    var h = '';
    h += '<div class="scroll">';
    h += '<div class="search-wrap">';
    h += '<div class="search-box">';
    h += '<input id="blogSearch" type="search" placeholder="Search posts… or #tag" value="' + esc(state.search) + '">';
    h += '<button class="search-clear' + (state.search?' on':'') + '" data-act="clearSearch" aria-label="Clear">×</button>';
    h += '</div>';
    if (topTags.length) {
      h += '<div class="tag-strip">';
      h += '<button class="tag-pill' + (!tag?' on':'') + '" data-act="pickTag" data-tag="">All posts</button>';
      topTags.forEach(function(t){
        h += '<button class="tag-pill hash' + (tag===t?' on':'') + '" data-act="pickTag" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
      });
      h += '</div>';
    }
    h += '</div>';

    if (!posts.length) {
      if (state.search || tag) {
        h += '<div class="tl-empty">No posts match that search.<br><br><button class="btn ghost" data-act="clearSearch">Clear search</button></div>';
      } else {
        h += '<div class="tl-empty">The blog is empty.<br><br>' +
             (state.admin ? '<button class="btn gold" data-act="adminNew">Write the first post →</button>' : '') +
             '</div>';
      }
    } else {
      h += '<div class="timeline">';
      posts.forEach(function(p){
        h += '<div class="tl-item">';
        h += '<button class="tl-card" data-act="openPost" data-slug="' + esc(p.slug) + '">';
        if (p.coverImage) h += '<img class="tl-card-img" loading="lazy" src="' + esc(p.coverImage) + '" alt="' + esc(p.title) + '">';
        h += '<div class="tl-card-body">';
        h += '<div class="tl-card-date">' + esc(formatDate(p.publishedAt||p.createdAt)) + '</div>';
        h += '<h2 class="tl-card-title">' + esc(p.title||'Untitled') + '</h2>';
        if (p.subtitle) h += '<p class="tl-card-sub">' + esc(p.subtitle) + '</p>';
        if ((p.tags||[]).length) {
          h += '<div class="tl-card-tags">';
          (p.tags||[]).slice(0,4).forEach(function(t){
            h += '<span class="tl-card-tag">#' + esc(t) + '</span>';
          });
          h += '</div>';
        }
        h += '<div class="tl-card-foot"><span>' + readTime(p) + ' min read</span><span class="tl-card-read">Read more →</span></div>';
        h += '</div>';
        h += '</button>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ============================================================
     POST VIEW
     ============================================================ */
  function renderPostView(slug){
    var post = resolvePost(slug);
    if (!post) {
      return '<div class="scroll"><div class="empty-post">Post not found.<br><br><button class="btn ghost" data-act="blogHome">← Back to the blog</button></div></div>';
    }

    var h = '<div class="scroll"><div class="post">';
    if (post.coverImage) h += '<img class="post-cover" src="' + esc(post.coverImage) + '" alt="' + esc(post.title) + '">';
    h += '<div class="post-head">';
    h += '<div class="post-meta"><span>' + esc(formatDate(post.publishedAt||post.createdAt)) + '</span><span>' + readTime(post) + ' min read</span></div>';
    h += '<h1 class="post-title">' + esc(post.title||'Untitled') + '</h1>';
    if (post.subtitle) h += '<p class="post-subtitle">' + esc(post.subtitle) + '</p>';
    if ((post.tags||[]).length) {
      h += '<div class="post-tags">';
      post.tags.forEach(function(t){
        h += '<button class="post-tag" data-act="tagJump" data-tag="' + esc(t) + '">#' + esc(t) + '</button>';
      });
      h += '</div>';
    }
    h += '</div>';
    h += '<div class="post-body">' + renderBlocks(post.blocks) + '</div>';
    h += '<div class="post-actions">';
    h += '<button class="btn wa" data-act="sharePost" data-slug="' + esc(post.slug) + '">Share on WhatsApp</button>';
    h += '<button class="btn ghost" data-act="copyLink" data-slug="' + esc(post.slug) + '">Copy link</button>';
    h += '</div>';
    h += '</div></div>';
    return h;
  }

  /* ============================================================
     ADMIN LIST
     ============================================================ */
  function renderAdminList(){
    var posts = allPosts();
    var h = '';
    h += '<div class="scroll"><div class="admin-wrap">';
    h += '<h1 class="admin-h1">Blog admin</h1>';
    h += '<p class="admin-sub">' + posts.length + ' post' + (posts.length===1?'':'s') + ' · ' + publishedPosts().length + ' published</p>';
    h += '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">';
    h += '<button class="btn gold" data-act="adminNew">+ New post</button>';
    h += '<button class="btn ghost" data-act="adminExport">Export all</button>';
    h += '<button class="btn ghost" data-act="blogHome">← Blog home</button>';
    h += '</div>';
    if (!posts.length) {
      h += '<div class="empty-admin">No posts yet.<br><br>Tap <b>+ New post</b> to write the first one.</div>';
    } else {
      posts.forEach(function(p){
        var status = p.status === 'published' ? 'published' : 'draft';
        h += '<div class="admin-post-row" data-act="adminEdit" data-id="' + esc(p.id) + '">';
        h += '<div class="admin-post-thumb">';
        if (p.coverImage) h += '<img src="' + esc(p.coverImage) + '" alt="">';
        else h += '<div class="placeholder">✦</div>';
        h += '</div>';
        h += '<div class="admin-post-info">';
        h += '<div class="admin-post-title">' + esc(p.title||'Untitled') + '</div>';
        h += '<div class="admin-post-meta">' + esc(formatDate(p.publishedAt||p.createdAt)) + ' · ' + (p.blocks||[]).length + ' blocks</div>';
        h += '</div>';
        h += '<span class="admin-post-status ' + status + '">' + status + '</span>';
        h += '</div>';
      });
    }
    h += '</div></div>';
    return h;
  }

  /* ============================================================
     ADMIN EDITOR
     ============================================================ */
  function draftFromPost(post){
    if (post) return JSON.parse(JSON.stringify(post));
    return {
      id: uid('post'),
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      publishedAt: null,
      title: '',
      slug: '',
      subtitle: '',
      coverImage: '',
      coverCaption: '',
      tags: [],
      blocks: []
    };
  }

  function renderAdminEdit(){
    var p = state.draft;
    if (!p) return '<div class="scroll"><div class="empty-admin">Loading…</div></div>';
    var h = '';
    h += '<div class="scroll"><div class="admin-wrap">';

    h += '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">';
    h += '<button class="btn ghost sm" data-act="adminList">← Posts</button>';
    h += '<button class="btn ghost sm" data-act="adminPreview">Preview</button>';
    h += '<button class="btn ' + (p.status==='published'?'ghost':'gold') + ' sm" data-act="togglePublish">' +
         (p.status==='published' ? 'Unpublish' : 'Publish') + '</button>';
    h += '</div>';

    /* Meta */
    h += '<div class="edit-meta">';
    h += '<div class="field"><label>Title *</label><input id="ef_title" data-field="title" value="' + esc(p.title) + '" placeholder="Post title"></div>';
    h += '<div class="field"><label>Slug (URL)</label><input id="ef_slug" data-field="slug" value="' + esc(p.slug) + '" placeholder="auto from title"></div>';
    h += '<div class="field"><label>Subtitle</label><input id="ef_subtitle" data-field="subtitle" value="' + esc(p.subtitle) + '" placeholder="Optional one-liner"></div>';
    h += '<div class="field"><label>Cover image URL</label><input id="ef_cover" data-field="coverImage" value="' + esc(p.coverImage) + '" placeholder="https://… or assets/…"></div>';
    h += '<div class="field"><label>Cover caption</label><input id="ef_covercap" data-field="coverCaption" value="' + esc(p.coverCaption) + '" placeholder="Optional"></div>';
    h += '<div class="field"><label>Tags</label>';
    h += '<div class="tag-input" id="tagInput">';
    (p.tags||[]).forEach(function(t, i){
      h += '<span class="tag-chip">#' + esc(t) + '<button data-act="removeTag" data-i="' + i + '">×</button></span>';
    });
    h += '<input id="ef_tagNew" placeholder="Type a tag and press Enter" autocomplete="off">';
    h += '</div>';
    h += '<div class="hint">Tags power search and the #hashtag filter.</div>';
    h += '</div>';
    h += '</div>';

    /* Blocks */
    h += '<div class="block-stack">';
    (p.blocks||[]).forEach(function(b, i){ h += renderBlockCard(b, i); });
    h += '</div>';

    /* Add block */
    h += '<div class="add-block">';
    h += '<div class="add-block-title">Add a block</div>';
    h += '<div class="add-block-grid">';
    BLOCK_TYPES.forEach(function(bt){
      h += '<button data-act="addBlock" data-type="' + bt.type + '"><span>' + bt.icon + '</span>' + esc(bt.name) + '</button>';
    });
    h += '</div>';
    h += '</div>';

    /* Version history (grafted from eatouts-blog-admin.js) */
    h += renderVersionList(p);

    h += '</div></div>';
    return h;
  }

  function renderBlockCard(b, i){
    var bt = BLOCK_TYPES.filter(function(x){ return x.type === b.type; })[0] || { name:b.type, icon:'?' };
    var h = '';
    h += '<div class="block-card" data-block="' + i + '">';
    h += '<div class="block-head">';
    h += '<span class="block-type">' + bt.icon + ' ' + esc(bt.name) + '</span>';
    h += '<span class="block-num">#' + (i+1) + '</span>';
    h += '<div class="block-actions">';
    h += '<button data-act="blockUp" data-i="' + i + '" title="Move up">↑</button>';
    h += '<button data-act="blockDown" data-i="' + i + '" title="Move down">↓</button>';
    h += '<button data-act="blockDup" data-i="' + i + '" title="Duplicate">⎘</button>';
    h += '<button class="danger" data-act="blockDel" data-i="' + i + '" title="Delete">×</button>';
    h += '</div>';
    h += '</div>';
    h += '<div class="block-body">' + renderBlockFields(b, i) + '</div>';
    h += '</div>';
    return h;
  }

  function renderBlockFields(b, i){
    var f = 'data-i="' + i + '"';
    switch (b.type) {
      case 'heading':
      case 'subheading':
        return '<div class="field"><input data-bf="text" ' + f + ' value="' + esc(b.text||'') + '" placeholder="' + (b.type==='heading'?'Heading text':'Sub-heading text') + '"></div>';
      case 'text':
        return '<div class="field"><textarea data-bf="text" ' + f + ' rows="4" placeholder="Write a paragraph. Support **bold** and *italic*.">' + esc(b.text||'') + '</textarea></div>';
      case 'image':
        return '<div class="field"><label>Image URL</label><input data-bf="src" ' + f + ' value="' + esc(b.src||'') + '"></div>' +
          '<div class="field"><label>Alt text</label><input data-bf="alt" ' + f + ' value="' + esc(b.alt||'') + '"></div>' +
          '<div class="field"><label>Caption</label><input data-bf="caption" ' + f + ' value="' + esc(b.caption||'') + '"></div>';
      case 'gallery':
        return '<div class="field"><label>Image URLs — one per line</label><textarea data-bf="images" ' + f + ' rows="4">' +
          esc((b.images||[]).map(function(im){ return im.src; }).join('\n')) +
          '</textarea></div>' +
          '<div class="field"><label>Caption</label><input data-bf="caption" ' + f + ' value="' + esc(b.caption||'') + '"></div>';
      case 'video':
        return '<div class="field"><label>Video URL</label><input data-bf="src" ' + f + ' value="' + esc(b.src||'') + '"></div>' +
          '<div class="field"><label>Poster URL</label><input data-bf="poster" ' + f + ' value="' + esc(b.poster||'') + '"></div>' +
          '<div class="field"><label>Caption</label><input data-bf="caption" ' + f + ' value="' + esc(b.caption||'') + '"></div>';
      case 'link':
        return '<div class="field"><label>URL</label><input data-bf="url" ' + f + ' value="' + esc(b.url||'') + '"></div>' +
          '<div class="field"><label>Label</label><input data-bf="label" ' + f + ' value="' + esc(b.label||'') + '"></div>' +
          '<div class="field"><label>Description</label><input data-bf="description" ' + f + ' value="' + esc(b.description||'') + '"></div>';
      case 'divider':
        return '<div class="hint" style="padding:6px 0">A horizontal line. No fields to fill in.</div>';
      case 'quote':
        return '<div class="field"><label>Quote</label><textarea data-bf="text" ' + f + ' rows="3">' + esc(b.text||'') + '</textarea></div>' +
          '<div class="field"><label>Attribution</label><input data-bf="attribution" ' + f + ' value="' + esc(b.attribution||'') + '"></div>';
      case 'list':
        return '<div class="field"><label>Items — one per line</label><textarea data-bf="items" ' + f + ' rows="4">' +
          esc((b.items||[]).join('\n')) +
          '</textarea></div>' +
          '<label class="sw"><input type="checkbox" data-bf="ordered" ' + f + (b.ordered?' checked':'') +
          '><span class="track"></span><span class="lbl">Numbered list</span></label>';
      case 'callout':
        return '<div class="field"><label>Variant</label><select data-bf="variant" ' + f + '>' +
            '<option value="info"' + (b.variant==='info'||!b.variant?' selected':'') + '>Info (blue)</option>' +
            '<option value="success"' + (b.variant==='success'?' selected':'') + '>Success (green)</option>' +
            '<option value="warning"' + (b.variant==='warning'?' selected':'') + '>Warning (yellow)</option>' +
          '</select></div>' +
          '<div class="field"><label>Text</label><textarea data-bf="text" ' + f + ' rows="3">' + esc(b.text||'') + '</textarea></div>';
      default:
        return '<div class="hint">Unknown block type: ' + esc(b.type) + '</div>';
    }
  }

  /* ============================================================
     ACTION BAR (admin edit)
     ============================================================ */
  function renderBar(){
    if (!els.bar) return;
    if (state.view !== 'admin-edit' || !state.draft) {
      els.bar.innerHTML = '';
      els.bar.style.display = 'none';
      return;
    }
    els.bar.style.display = 'flex';
    var p = state.draft;
    var published = p.status === 'published';
    els.bar.innerHTML =
      '<button class="btn ghost" data-act="adminList">Cancel</button>' +
      '<button class="btn primary" data-act="savePost">' + (published?'Save':'Save draft') + '</button>' +
      '<button class="btn ' + (published?'ghost':'gold') + '" data-act="togglePublish">' +
        (published?'Unpublish':'Publish') + '</button>';
  }

  /* ============================================================
     HEADER
     ============================================================ */
  function paintHeader(){
    var back = document.getElementById('hdrBack');
    var page = document.getElementById('hdrPage');
    if (back) back.style.display = (state.view === 'timeline' ? 'none' : '');
    if (page) {
      page.textContent = state.view === 'timeline' ? 'Blog'
        : state.view === 'post' ? 'Post'
        : state.view === 'admin-list' ? 'Admin'
        : 'Edit post';
    }
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function render(){
    if (!els.mount) return;
    rebuildTagIndex();

    var html = '';
    if (state.view === 'post') html = renderPostView(state.postSlug);
    else if (state.view === 'admin-list') html = renderAdminList();
    else if (state.view === 'admin-edit') html = renderAdminEdit();
    else html = renderTimeline();

    var screen = '<div class="screen">' + html + '</div>';
    els.mount.innerHTML = screen;

    /* OG meta tracks the open post; cleared everywhere else */
    if (state.view === 'post') {
      var ogPost = resolvePost(state.postSlug);
      if (ogPost) applyOgTags(ogPost);
      else clearOgTags();
    } else {
      clearOgTags();
    }

    if (state.previewOpen) mountPreview();
    renderBar();
    paintHeader();
    bindInputs();
  }

  function mountPreview(){
    if (!state.draft) return;
    var wrap = document.createElement('div');
    wrap.className = 'preview-scrim';
    wrap.innerHTML =
      '<div class="preview-inner">' +
        '<div class="preview-head">' +
          '<h3>Preview</h3>' +
          '<button class="btn ghost sm" data-act="closePreview">Close</button>' +
        '</div>' +
        '<div class="preview-body">' + renderPostViewHtml(state.draft) + '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function(ev){
      if (ev.target === wrap) closePreview();
    });
  }
  function closePreview(){
    state.previewOpen = false;
    var el = document.querySelector('.preview-scrim');
    if (el) el.remove();
  }
  function renderPostViewHtml(p){
    var h = '<div class="post">';
    if (p.coverImage) h += '<img class="post-cover" src="' + esc(p.coverImage) + '" alt="' + esc(p.title) + '">';
    h += '<div class="post-head">';
    h += '<div class="post-meta"><span>' + esc(formatDate(p.publishedAt||p.createdAt)) + '</span><span>' + readTime(p) + ' min read</span></div>';
    h += '<h1 class="post-title">' + esc(p.title||'Untitled') + '</h1>';
    if (p.subtitle) h += '<p class="post-subtitle">' + esc(p.subtitle) + '</p>';
    h += '</div>';
    h += '<div class="post-body">' + renderBlocks(p.blocks) + '</div>';
    h += '</div>';
    return h;
  }

  /* ============================================================
     INPUT BINDING
     ============================================================ */
  function bindInputs(){
    var p = state.draft;

    /* Search input */
    var search = document.getElementById('blogSearch');
    if (search) {
      search.addEventListener('input', function(){
        state.search = search.value;
      });
    }

    /* Tag input in admin edit */
    var tagInput = document.getElementById('ef_tagNew');
    if (tagInput && p) {
      tagInput.addEventListener('keydown', function(ev){
        if (ev.key === 'Enter' || ev.key === ',') {
          ev.preventDefault();
          var raw = tagInput.value.trim().replace(/^#/,'').toLowerCase();
          if (!raw) return;
          if (!p.tags) p.tags = [];
          if (p.tags.indexOf(raw) === -1) p.tags.push(raw);
          tagInput.value = '';
          scheduleAutosave();
          render();
          setTimeout(function(){
            var again = document.getElementById('ef_tagNew');
            if (again) again.focus();
          }, 10);
        }
      });
    }

    /* Meta fields */
    document.querySelectorAll('[data-field]').forEach(function(el){
      if (!p) return;
      el.addEventListener('input', function(){
        var key = el.getAttribute('data-field');
        p[key] = el.value;
        scheduleAutosave();
      });
    });

    /* Block fields */
    document.querySelectorAll('[data-bf]').forEach(function(el){
      var i = parseInt(el.getAttribute('data-i'), 10);
      var key = el.getAttribute('data-bf');
      if (!p || !p.blocks[i]) return;
      var block = p.blocks[i];
      el.addEventListener('input', function(){
        if (key === 'images') {
          block.images = el.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean).map(function(src){ return { src: src }; });
        } else if (key === 'items') {
          block.items = el.value.split('\n');
        } else if (key === 'ordered') {
          block.ordered = el.checked;
        } else {
          block[key] = el.value;
        }
        scheduleAutosave();
      });
      el.addEventListener('change', function(){
        if (key === 'ordered') { block.ordered = el.checked; scheduleAutosave(); }
        if (key === 'variant') { block.variant = el.value; scheduleAutosave(); }
      });
    });
  }

  function scheduleAutosave(){
    if (!state.draft) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function(){
      if (!state.draft) return;
      if (!state.draft.slug) state.draft.slug = makeSlugUnique(state.draft.title||'post', state.draft.id);
      state.draft.updatedAt = Date.now();
      upsertPost(state.draft);
    }, AUTOSAVE_MS);
  }

  /* ============================================================
     NEW BLOCK
     ============================================================ */
  function newBlock(type){
    switch (type) {
      case 'heading':    return { type:'heading',    text:'' };
      case 'subheading': return { type:'subheading', text:'' };
      case 'text':       return { type:'text',       text:'' };
      case 'image':      return { type:'image',      src:'', alt:'', caption:'' };
      case 'gallery':    return { type:'gallery',    images:[], caption:'' };
      case 'video':      return { type:'video',      src:'', poster:'', caption:'' };
      case 'link':       return { type:'link',       url:'', label:'', description:'' };
      case 'divider':    return { type:'divider' };
      case 'quote':      return { type:'quote',      text:'', attribution:'' };
      case 'list':       return { type:'list',       ordered:false, items:[] };
      case 'callout':    return { type:'callout',    variant:'info', text:'' };
      default:           return { type:'text',       text:'' };
    }
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  function exportAllPosts(){
    var posts = publishedPosts();
    var feed = {
      generatedAt: new Date().toISOString(),
      postCount: posts.length,
      posts: posts
    };

    if (window.EatoutsCloud && EatoutsCloud.isConfigured && EatoutsCloud.isConfigured()) {
      toast('Publishing to cloud…');
      EatoutsCloud.publishBlogFeed(feed).then(function(res){
        if (res && res.ok) toast('Published ' + posts.length + ' post' + (posts.length===1?'':'s') + ' to the cloud');
        else { toast('Cloud publish failed — downloading instead'); downloadFeed(feed); }
      });
      return;
    }
    downloadFeed(feed);
  }
  function downloadFeed(feed){
    var blob = new Blob([JSON.stringify(feed, null, 2)], { type:'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'blog_posts.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Downloaded ' + (feed.posts||[]).length + ' post' + ((feed.posts||[]).length===1?'':'s'));
  }

  /* ============================================================
     ACTIONS
     ============================================================ */
  function handleAction(act, el, ev){
    var p = state.draft;

    /* Navigation */
    if (act === 'blogHome') { state.view = 'timeline'; state.postSlug = null; state.previewOpen = false; closePreview(); render(); setTagHash(state.activeTag); return; }
    if (act === 'openPost') {
      state.view = 'post';
      state.postSlug = el.getAttribute('data-slug');
      render();
      window.scrollTo(0,0);
      return;
    }
    if (act === 'tagJump') {
      state.activeTag = el.getAttribute('data-tag');
      state.search = '';
      state.view = 'timeline';
      state.postSlug = null;
      render();
      setTagHash(state.activeTag);
      return;
    }
    if (act === 'pickTag') { state.activeTag = el.getAttribute('data-tag') || ''; render(); setTagHash(state.activeTag); return; }
    if (act === 'clearSearch') { state.search = ''; state.activeTag = ''; render(); setTagHash(''); return; }

    /* Sharing */
    if (act === 'sharePost') {
      var slug = el.getAttribute('data-slug');
      var post = findPost(slug);
      if (!post) {
        var cached = loadCachedFeed();
        if (cached && cached.posts) {
          for (var i=0;i<cached.posts.length;i++) {
            if (cached.posts[i].slug === slug) { post = cached.posts[i]; break; }
          }
        }
      }
      if (!post) return;
      var url = postUrl(slug);
      var firstText = (post.blocks||[]).filter(function(b){ return b.type === 'text'; })[0];
      var preview = firstText ? ' — ' + String(firstText.text||'').slice(0,120) : '';
      var msg = '*' + (post.title || 'EatOuts') + '*' + preview + '\n\n' + url;
      window.location.href = 'https://wa.me/?text=' + encodeURIComponent(msg);
      return;
    }
    if (act === 'copyLink') {
      var cs = el.getAttribute('data-slug');
      var curl = postUrl(cs);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(curl).then(function(){ toast('Link copied'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = curl; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('Link copied'); } catch(e){}
        ta.remove();
      }
      return;
    }

    /* Admin entry */
    if (act === 'blogAdmin' || act === 'adminList') {
      state.view = 'admin-list';
      state.draft = null;
      render();
      return;
    }
    if (act === 'adminNew') {
      state.draft = draftFromPost(null);
      state.view = 'admin-edit';
      render();
      return;
    }
    if (act === 'adminEdit') {
      var id = el.getAttribute('data-id');
      var found = findPost(id);
      if (!found) return;
      state.draft = draftFromPost(found);
      state.view = 'admin-edit';
      render();
      return;
    }
    if (act === 'savePost') {
      if (!p) return;
      if (!p.title) { toast('Add a title'); return; }
      if (!p.slug) p.slug = makeSlugUnique(p.title, p.id);
      if (JSON.stringify(p).length > POST_JSON_LIMIT) { toast('Post too large — max 200KB'); return; }
      p.updatedAt = Date.now();
      snapshot(p);
      upsertPost(p);
      toast('Saved');
      return;
    }
    if (act === 'togglePublish') {
      if (!p) return;
      if (!p.title) { toast('Add a title first'); return; }
      if (!p.slug) p.slug = makeSlugUnique(p.title, p.id);
      if (p.status === 'published') { p.status = 'draft'; p.publishedAt = null; toast('Unpublished'); }
      else { p.status = 'published'; p.publishedAt = Date.now(); toast('Published'); }
      p.updatedAt = Date.now();
      snapshot(p);
      upsertPost(p);
      render();
      return;
    }
    if (act === 'adminPreview') { state.previewOpen = true; render(); return; }
    if (act === 'closePreview') { closePreview(); return; }
    if (act === 'adminExport') { exportAllPosts(); return; }

    /* Meta */
    if (act === 'removeTag') {
      var ti = parseInt(el.getAttribute('data-i'), 10);
      if (p && p.tags) { p.tags.splice(ti, 1); scheduleAutosave(); render(); }
      return;
    }

    /* Version restore (grafted from eatouts-blog-admin.js) */
    if (act === 'restoreVer') {
      if (!p || !p.id) return;
      var vi = parseInt(el.getAttribute('data-i'), 10);
      var histArr = postHistory(findPost(p.id) || p);
      var ver = histArr[vi];
      if (!ver) return;
      if (!confirm('Restore this version? Current fields will be replaced (save to keep it).')) return;
      p.title = ver.title; p.slug = ver.slug; p.subtitle = ver.subtitle;
      p.coverImage = ver.coverImage; p.coverCaption = ver.coverCaption;
      p.tags = (ver.tags || []).slice();
      p.blocks = JSON.parse(JSON.stringify(ver.blocks || []));
      p.status = ver.status; p.publishedAt = ver.publishedAt;
      render();
      toast('Version restored — press Save to keep it');
      return;
    }

    /* Block ops */
    if (act === 'addBlock') {
      if (!p) return;
      if ((p.blocks||[]).length >= MAX_BLOCKS) { toast('Max ' + MAX_BLOCKS + ' blocks per post'); return; }
      p.blocks.push(newBlock(el.getAttribute('data-type')));
      scheduleAutosave();
      render();
      setTimeout(function(){
        var cards = document.querySelectorAll('.block-card');
        var last = cards[cards.length-1];
        if (last && last.scrollIntoView) last.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 30);
      return;
    }
    if (act === 'blockUp' || act === 'blockDown') {
      var bi = parseInt(el.getAttribute('data-i'), 10);
      var dir = act === 'blockUp' ? -1 : 1;
      var j = bi + dir;
      if (!p || j < 0 || j >= p.blocks.length) return;
      var tmp = p.blocks[bi]; p.blocks[bi] = p.blocks[j]; p.blocks[j] = tmp;
      scheduleAutosave(); render();
      return;
    }
    if (act === 'blockDup') {
      var di = parseInt(el.getAttribute('data-i'), 10);
      if (!p) return;
      var copy = JSON.parse(JSON.stringify(p.blocks[di]));
      p.blocks.splice(di + 1, 0, copy);
      scheduleAutosave(); render();
      return;
    }
    if (act === 'blockDel') {
      var xi = parseInt(el.getAttribute('data-i'), 10);
      if (!p) return;
      if (!confirm('Delete this block?')) return;
      p.blocks.splice(xi, 1);
      scheduleAutosave(); render();
      return;
    }
  }

  /* ============================================================
     BACK
     ============================================================ */
  function back(){
    if (state.view === 'post') { state.view = 'timeline'; state.postSlug = null; render(); return; }
    if (state.view === 'admin-edit') { state.view = 'admin-list'; state.draft = null; render(); return; }
    if (state.view === 'admin-list') { state.view = 'timeline'; render(); return; }
    window.location.href = 'index.html';
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  function init(opts){
    try {
      els.mount = (opts && opts.mount) || document.getElementById('viewport');
      els.bar = document.getElementById('bar');
      state.admin = !!(opts && opts.isAdmin);

      if (!els.mount) throw new Error('No mount element');

      DEFAULT_DOC_TITLE = document.title;

      /* Deep link: #tag-<slug> opens the timeline filtered to that tag */
      rebuildTagIndex();
      state.activeTag = readTagFromHash();
      window.addEventListener('hashchange', function(){
        var t = readTagFromHash();
        if (state.view === 'timeline' && state.activeTag === t) return;
        state.activeTag = t;
        state.search = '';
        state.view = 'timeline';
        state.postSlug = null;
        render();
      });

      /* If the store is empty, try to bootstrap from the public feed.
         When that lands, re-render so the timeline is populated. */
      var wasEmpty = loadStore().posts.length === 0;
      if (wasEmpty) {
        fetchFeed().then(function(feed){
          if (feed) {
            bootstrapFromFeed(feed);
            rebuildTagIndex();
            /* a #tag- deep link may have arrived before the feed populated TAG_INDEX */
            var t = readTagFromHash();
            if (t) state.activeTag = t;
            render();
          }
        }).catch(function(){});
      }

      render();
      window.addEventListener('beforeunload', function(){ clearTimeout(autosaveTimer); });
    } catch(err) {
      console.error('[blog] init failed', err);
      var m = (opts && opts.mount) || document.getElementById('viewport');
      if (m) m.innerHTML =
        '<div style="padding:40px 20px;text-align:center;color:#c43c3c;font-size:13px;line-height:1.7">' +
          '<b>Blog failed to start.</b><br><br>' +
          esc(err && err.message || String(err)) +
        '</div>';
    }
  }

  function setAdmin(v){
    state.admin = !!v;
    if (!state.admin && (state.view === 'admin-list' || state.view === 'admin-edit')) {
      state.view = 'timeline';
      state.draft = null;
    }
    render();
  }
  function isAdmin(){ return state.admin; }
  function setSearch(q){
    state.search = String(q || '');
    var inp = document.getElementById('blogSearch');
    var wasFocused = inp && document.activeElement === inp;
    var selStart = inp ? inp.selectionStart : null;
    var selEnd = inp ? inp.selectionEnd : null;
    render();
    if (wasFocused) {
      var again = document.getElementById('blogSearch');
      if (again) { again.focus(); if (selStart != null) again.setSelectionRange(selStart, selEnd); }
    }
  }
  function openPostBySlug(slug){
    if (!slug) return;
    state.view = 'post';
    state.postSlug = slug;
    render();
  }

  window.EatoutsBlog = {
    init: init,
    back: back,
    setAdmin: setAdmin,
    isAdmin: isAdmin,
    setSearch: setSearch,
    handleAction: handleAction,
    openPostBySlug: openPostBySlug,
    _state: function(){ return state; }
  };
})();