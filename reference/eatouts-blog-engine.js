/* ============================================================
   EATOUTS BLOG — ENGINE (PART 1: CORE)
   Timeline, post view, OG tags, search, sharing, offline cache.
   Exposes window.EatoutsBlog.

   Load order (must match eatouts-blog.html):
     1. js/eatouts-db.js          → EatoutsDB
     2. js/eatouts-auth.js        → EatoutsAuth
     3. js/eatouts-brand.js       → esc, EatoutsBrand.slugify
     4. eatouts-image-compressor.js → EatoutsImageCompressor (unused until upload surface)
     5. eatouts-video-validator.js  → EatoutsVideoValidator (unused until upload surface)
     6. eatouts-blog.js           → window.EATOUTS_BLOG_POSTS (seed posts)
     7. js/eatouts-blog-engine.js → window.EatoutsBlog  (this file)
     8. js/eatouts-blog-admin.js  → admin composer extension (appended to EatoutsBlog)
   ============================================================ */
(function(){
  'use strict';

  var SLUG_SAFE = /[^a-z0-9\-]/g;

  function slugify(s){
    if(typeof EatoutsBrand !== 'undefined' && EatoutsBrand && typeof EatoutsBrand.slugify === 'function'){
      return EatoutsBrand.slugify(s);
    }
    return String(s==null?'':s).toLowerCase().replace(SLUG_SAFE,'-').replace(/^-+|-+$/g,'');
  }

  function esc(s){
    if(typeof window.esc === 'function') return window.esc(s);
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;');
  }

  function toast(m){
    var t = document.getElementById('toast');
    if(!t) return;
    t.textContent = m;
    t.classList.add('on');
    clearTimeout(toast._tid);
    toast._tid = setTimeout(function(){ t.classList.remove('on'); }, 2200);
  }

  function money(n){
    n = Number(n||0);
    return 'P' + n.toFixed(2);
  }

  /* ---------- state ---------- */
  var STATE = {
    posts: [],            // live array (seed → localStorage → edits)
    cache: null,          // { posts, at }
    admin: false,
    view: 'timeline',    // 'timeline' | 'post' | 'admin' | 'edit' | 'preview'
    currentPost: null,   // post object when viewing/editing
    editId: null,        // post id being edited
    search: '',
    tagFilter: null,     // tag string or null
    history: {},         // id -> [version, ...]
    autoSaveTimer: null,
    dirty: false
  };

  var OPS_KEY = 'eatouts_blog_v1';
  var CACHE_KEY = 'eatouts_blog_cache_v1';
  var POST_LIMIT = 50;
  var BLOCK_LIMIT = 30;
  var VERSION_LIMIT = 10;
  var CACHE_BYTES_LIMIT = 4 * 1024 * 1024; // 4 MB
  var POST_JSON_LIMIT = 200 * 1024;        // 200 KB per post

  /* ---------- persistence ---------- */
  function loadStore(){
    try{
      var raw = localStorage.getItem(OPS_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ /* ignore */ }
    return null;
  }
  function saveStore(){
    try{
      var data = {
        posts: STATE.posts,
        history: STATE.history,
        updatedAt: Date.now()
      };
      var json = JSON.stringify(data);
      if(json.length > CACHE_BYTES_LIMIT){
        // Keep posts but drop history to fit
        var slim = { posts: STATE.posts, updatedAt: Date.now() };
        localStorage.setItem(OPS_KEY, JSON.stringify(slim));
      }else{
        localStorage.setItem(OPS_KEY, json);
      }
    }catch(e){
      toast('Could not save blog — storage may be full');
    }
  }
  function loadCache(){
    try{
      var raw = localStorage.getItem(CACHE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ /* ignore */ }
    return null;
  }
  function saveCache(posts){
    try{
      var obj = { posts: posts, at: Date.now() };
      var json = JSON.stringify(obj);
      if(json.length <= CACHE_BYTES_LIMIT){
        localStorage.setItem(CACHE_KEY, json);
      }
    }catch(e){ /* ignore */ }
  }

  /* ---------- seed → storage flow ---------- */
  function getPublishedPosts(){
    var all = STATE.posts;
    return all.filter(function(p){ return p && p.status === 'published'; })
      .sort(function(a,b){
        var da = a.publishedAt || 0, db = b.publishedAt || 0;
        return db - da;
      });
  }

  function getPostById(id){
    return STATE.posts.filter(function(p){ return p && p.id === id; })[0] || null;
  }
  function getPostBySlug(slug){
    return STATE.posts.filter(function(p){ return p && p.slug === slug; })[0] || null;
  }

  function initialisePosts(){
    // If localStorage already has posts, use them (seed never overwrites).
    var store = loadStore();
    if(store && Array.isArray(store.posts) && store.posts.length){
      STATE.posts = store.posts;
      STATE.history = (store.history && typeof store.history === 'object') ? store.history : {};
      return;
    }
    // Otherwise seed from the static file, but never overwrite existing.
    var seed = (typeof window.EATOUTS_BLOG_POSTS === 'object' && Array.isArray(window.EATOUTS_BLOG_POSTS))
      ? window.EATOUTS_BLOG_POSTS : [];
    if(!seed.length){
      STATE.posts = [];
      return;
    }
    STATE.posts = seed.map(function(p){
      return Object.assign({}, p, {
        id: p.id || ('post_' + slugify(p.title || 'post') + '_' + Math.random().toString(36).slice(2,7)),
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now()
      });
    });
    STATE.history = {};
    saveStore();
  }

  /* ---------- OG tags for deep-linked posts ---------- */
  function applyOgTags(post){
    var head = document.getElementsByTagName('head')[0];
    if(!head) return;
    var set = function(name, content){
      var m = head.querySelector('meta[property="'+name+'"],meta[name="'+name+'"]');
      if(!m){
        m = document.createElement('meta');
        if(name.indexOf('og:') === 0) m.setAttribute('property', name);
        else m.setAttribute('name', name);
        head.appendChild(m);
      }
      m.setAttribute('content', content || '');
    };
    var title = post && post.title ? post.title : 'EatOuts Blog';
    var desc = post && post.subtitle ? post.subtitle
      : (post && post.blocks && post.blocks[0] && post.blocks[0].text
          ? post.blocks[0].text.slice(0, 155) : 'Stories, guides, and honest updates from Botswana\'s restaurant scene.');
    var url = window.location.href.split('#')[0];
    var image = post && post.coverImage ? post.coverImage : '';

    set('title', title);
    set('og:title', title);
    set('description', desc);
    set('og:description', desc);
    set('og:type', 'article');
    set('og:url', url + '?post=' + (post && post.slug || ''));
    set('og:image', image);
    set('twitter:card', 'summary_large_image');
    set('twitter:title', title);
    set('twitter:description', desc);
    set('twitter:image', image);
  }

  function clearOgTags(){
    var head = document.getElementsByTagName('head')[0];
    if(!head) return;
    ['title','og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image']
      .forEach(function(name){
        var m = head.querySelector('meta[property="'+name+'"],meta[name="'+name+'"]');
        if(m) m.remove();
      });
  }

  /* ---------- view rendering ---------- */
  var container = null;

  function render(view, extra){
    if(!container) return;
    container.innerHTML = '';
    if(view === 'timeline') renderTimeline(container, extra);
    else if(view === 'post') renderPostView(container, extra);
    else if(view === 'admin') renderAdmin(container);
    else if(view === 'edit') renderEditPost(container, extra);
    else if(view === 'preview') renderPostPreview(container, extra);
    else container.innerHTML = '<div class="empty-admin">Unknown view.</div>';
    afterRender(view, extra);
  }

  function afterRender(view, extra){
    updateNav(stateView());
    updateHeader(stateView(), extra);
  }

  function stateView(){
    return STATE.view;
  }

  function updateNav(view){
    var nav = document.getElementById('bottomNav');
    if(!nav) return;
    var btns = nav.querySelectorAll('.nav-btn');
    btns.forEach(function(b){
      var act = b.getAttribute('data-act');
      if(act === 'blogHome') b.classList.toggle('on', view === 'timeline' || view === 'post');
      else if(act === 'blogAdmin') b.classList.toggle('on', view === 'admin' || view === 'edit');
    });
  }

  function updateHeader(view, extra){
    var back = document.getElementById('hdrBack');
    var page = document.getElementById('hdrPage');
    if(!back || !page) return;
    if(view === 'post' || view === 'edit' || view === 'preview'){
      back.style.display = '';
    }else{
      back.style.display = 'none';
    }
    if(view === 'post' && extra && extra.post){
      page.textContent = 'Post';
    }else if(view === 'edit'){
      page.textContent = 'Edit post';
    }else if(view === 'admin'){
      page.textContent = 'Admin';
    }else{
      page.textContent = 'Blog';
    }
  }

  /* ---------- timeline ---------- */
  function renderTimeline(root, extra){
    var posts = getPublishedPosts();
    var search = STATE.search.trim();
    var tag = STATE.tagFilter;

    // filter
    var filtered = posts;
    if(search || tag){
      filtered = posts.filter(function(p){
        return matchPost(p, search, tag);
      });
    }

    var h = '';
    h += '<div class="searchwrap">' +
      '<div class="search-box">' +
        '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
        '<input id="blogSearch" type="search" placeholder="Search posts… or #tag" value="' + esc(search) + '" autocomplete="off">' +
        '<button class="search-clear' + (search ? ' on' : '') + '" id="blogSearchClear" type="button" aria-label="Clear search">×</button>' +
      '</div>' +
      (STATE.tagFilter || search ? '<div style="margin-top:8px"><button class="btn sm ghost" data-act="clearSearch" type="button">Clear search</button></div>' : '') +
    '</div>';

    // tag strip
    var tags = collectTags(posts);
    h += '<div class="tag-strip" id="tagStrip">';
    h += '<button class="tag-pill' + (!tag && !search ? ' on' : '') + '" data-act="tagFilter" data-tag="" type="button">All</button>';
    tags.forEach(function(t){
      var on = (tag === t);
      h += '<button class="tag-pill' + (on ? ' on' : '') + '" data-act="tagFilter" data-tag="' + esc(t) + '" type="button">' +
        '<span class="hash">#</span>' + esc(t) + '</button>';
    });
    h += '</div>';

    if(!filtered.length){
      h += '<div class="tl-empty">' +
        (search || tag
          ? 'No posts match ' + (tag ? '"#' + esc(tag) + '"' : '') + (search && tag ? ' or "' + esc(search) + '"' : '') + '.'
          : 'No posts yet — check back soon.') +
      '</div>';
      root.innerHTML = h;
      return;
    }

    h += '<div class="timeline">';
    filtered.forEach(function(p, i){
      h += renderTimelineItem(p, i);
    });
    h += '</div>';
    h += '<div style="height:44px"></div>';
    root.innerHTML = h;
  }

  function renderTimelineItem(p, i){
    var date = formatDate(p.publishedAt);
    var tags = (p.tags && p.tags.length) ? p.tags.slice(0, 4) : [];
    var firstText = firstTextBlock(p);
    var readMore = (p.blocks && p.blocks.length > 1) ? 'read more' : '';

    var h = '<div class="tl-item">' +
      '<a class="tl-card" href="?post=' + esc(p.slug) + '" data-post-id="' + esc(p.id) + '" data-act="openPost">' +
        (p.coverImage
          ? '<img class="tl-card-img" src="' + esc(p.coverImage) + '" alt="' + esc(p.coverCaption || p.title || '') + '" loading="lazy">'
          : '') +
        '<div class="tl-card-body">' +
          '<div class="tl-card-date">' + esc(date) + '</div>' +
          '<h3 class="tl-card-title">' + esc(p.title) + '</h3>' +
          (p.subtitle ? '<p class="tl-card-sub">' + esc(p.subtitle) + '</p>' : '') +
          (tags.length ? '<div class="tl-card-tags">' +
            tags.map(function(t){ return '<span class="tl-card-tag">' + esc('#' + t) + '</span>'; }).join('') +
          '</div>' : '') +
          '<div class="tl-card-foot"><span>' + (firstText ? esc(firstText.slice(0, 90)) + (firstText.length > 90 ? '…' : '') : '') + '</span>' +
            '<span class="tl-card-read">' + esc(readMore) + ' →</span>' +
          '</div>' +
        '</div>' +
      '</a>' +
    '</div>';
    return h;
  }

  function firstTextBlock(p){
    if(!p || !p.blocks || !p.blocks.length) return '';
    for(var i = 0; i < p.blocks.length; i++){
      var b = p.blocks[i];
      if(b && b.type === 'text' && b.text) return b.text;
    }
    return '';
  }

  function collectTags(posts){
    var set = {};
    posts.forEach(function(p){
      (p.tags || []).forEach(function(t){
        set[t] = true;
      });
    });
    return Object.keys(set).sort();
  }

  function formatDate(ts){
    if(!ts) return '';
    var d = new Date(ts);
    if(isNaN(d.getTime())) return '';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* ---------- search ---------- */
  function matchPost(p, search, tag){
    var haystack = '';
    if(p.title) haystack += ' ' + p.title;
    if(p.subtitle) haystack += ' ' + p.subtitle;
    if(p.tags) p.tags.forEach(function(t){ haystack += ' ' + t; });
    if(p.blocks) p.blocks.forEach(function(b){
      if(b.text) haystack += ' ' + b.text;
      if(b.label) haystack += ' ' + b.label;
    });
    haystack = haystack.toLowerCase();

    if(tag){
      if(tag.indexOf('#') === 0) tag = tag.slice(1);
      tag = tag.replace(/\s+/g, '');
      if(tag && (p.tags || []).indexOf(tag) === -1) return false;
    }

    if(search){
      var parts = search.replace(/#/g, ' ').split(/\s+/).filter(Boolean);
      if(parts.length){
        // if any part starts with #, treat as tag AND
        var tagParts = parts.filter(function(x){ return x.indexOf('#') === 0; }).map(function(x){ return x.replace(/^#/, ''); });
        var wordParts = parts.filter(function(x){ return x.indexOf('#') !== 0; });
        tagParts.forEach(function(t){
          if((p.tags || []).indexOf(t) === -1) return false;
        });
        if(wordParts.length){
          var hay = haystack;
          for(var w = 0; w < wordParts.length; w++){
            if(hay.indexOf(wordParts[w].toLowerCase()) === -1) return false;
          }
        }
      }
    }
    return true;
  }

  /* ---------- post view ---------- */
  function renderPostView(root, post){
    if(!post){ root.innerHTML = '<div class="empty-post">Post not found.</div>'; return; }
    applyOgTags(post);
    var h = '';
    h += '<div class="scroll"><div class="post">' +
      (post.coverImage
        ? '<img class="post-cover" src="' + esc(post.coverImage) + '" alt="' + esc(post.coverCaption || post.title || '') + '" loading="eager">'
        : '') +
      '<div class="post-head">' +
        '<div class="post-meta">' +
          '<span>' + esc(formatDate(post.publishedAt)) + '</span>' +
        '</div>' +
        '<h1 class="post-title">' + esc(post.title) + '</h1>' +
        (post.subtitle ? '<p class="post-subtitle">' + esc(post.subtitle) + '</p>' : '') +
        (post.tags && post.tags.length
          ? '<div class="post-tags">' + post.tags.map(function(t){
              return '<a class="post-tag" href="?post=' + esc(post.slug) + '#tag-' + esc(t) + '" data-act="tagSearch" data-tag="' + esc(t) + '">#' + esc(t) + '</a>';
            }).join('') + '</div>'
          : '') +
      '</div>' +
      '<div class="post-body">' + renderBlocks(post.blocks || []) + '</div>' +
      '<div class="post-actions">' +
        '<a class="btn wa" href="' + esc(whatsappShareUrl(post)) + '" type="button">Share on WhatsApp</a>' +
        '<a class="btn ghost" href="?post=' + esc(post.slug) + '" data-act="copyLink" type="button">Copy link</a>' +
      '</div>' +
    '</div></div>';
    root.innerHTML = h;
  }

  function renderBlocks(blocks){
    var h = '';
    blocks.forEach(function(b, i){
      if(!b) return;
      if(b.type === 'heading')      h += '<h2 class="blk-heading">' + escHtml(b.text) + '</h2>';
      else if(b.type === 'subheading') h += '<h3 class="blk-subheading">' + escHtml(b.text) + '</h3>';
      else if(b.type === 'text')    h += '<p class="blk-text">' + renderInline(escHtml(b.text)) + '</p>';
      else if(b.type === 'image')   h += renderImageBlock(b);
      else if(b.type === 'video')   h += renderVideoBlock(b);
      else if(b.type === 'gallery') h += renderGalleryBlock(b);
      else if(b.type === 'link')    h += renderLinkBlock(b);
      else if(b.type === 'divider') h += '<hr class="blk-divider">';
      else if(b.type === 'quote')   h += renderQuoteBlock(b);
      else if(b.type === 'list')    h += renderListBlock(b);
      else if(b.type === 'callout') h += renderCalloutBlock(b);
      else h += '<p class="blk-text">[block: ' + esc(b.type) + ']</p>';
    });
    return h;
  }

  function renderInline(html){
    // turn #tag into clickable search links
    return html.replace(/(#([a-z0-9][-a-z0-9]*))/gi, function(m, full, tag){
      return '<a class="tag-inline" href="?post=__SELF__#tag-' + esc(tag.toLowerCase()) + '" data-act="tagSearch" data-tag="' + esc(tag.toLowerCase()) + '">' + esc(full) + '</a>';
    }).replace(/\{LINK\}/g, '');
  }

  function renderImageBlock(b){
    var out = '<figure class="blk-image">';
    if(b.src) out += '<img src="' + esc(b.src) + '" alt="' + esc(b.alt || '') + '" loading="lazy">';
    if(b.caption) out += '<figcaption>' + esc(b.caption) + '</figcaption>';
    out += '</figure>';
    return out;
  }
  function renderVideoBlock(b){
    var out = '<figure class="blk-video">';
    if(b.poster) out += '<video src="' + esc(b.src || '') + '" poster="' + esc(b.poster) + '" controls preload="metadata" playsinline></video>';
    else if(b.src) out += '<video src="' + esc(b.src) + '" controls preload="metadata" playsinline></video>';
    if(b.caption) out += '<figcaption>' + esc(b.caption) + '</figcaption>';
    out += '</figure>';
    return out;
  }
  function renderGalleryBlock(b){
    if(!b.images || !b.images.length) return '';
    var out = '<div class="blk-gallery">';
    b.images.forEach(function(img){
      out += '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || '') + '" loading="lazy">';
    });
    out += '</div>';
    return out;
  }
  function renderLinkBlock(b){
    var url = b.url || '#';
    var out = '<a class="blk-link" href="' + esc(url) + '"' + (url.indexOf('http') === 0 ? ' target="_blank" rel="noopener"': '') + '>';
    if(b.label) out += '<b>' + esc(b.label) + '</b>';
    if(b.description) out += '<span>' + esc(b.description) + '</span>';
    out += '</a>';
    return out;
  }
  function renderQuoteBlock(b){
    var out = '<figure class="blk-quote">';
    if(b.text) out += '<p>' + escHtml(b.text) + '</p>';
    if(b.attribution) out += '<cite>' + escHtml(b.attribution) + '</cite>';
    out += '</figure>';
    return out;
  }
  function renderListBlock(b){
    var ordered = !!b.ordered;
    var out = '<' + (ordered ? 'ol' : 'ul') + ' class="blk-list">';
    (b.items || []).forEach(function(item){
      out += '<li>' + escHtml(item) + '</li>';
    });
    out += '</' + (ordered ? 'ol' : 'ul') + '>';
    return out;
  }
  function renderCalloutBlock(b){
    var variant = b.variant || 'info';
    var cls = 'blk-callout ' + ({
      info:'info', success:'success', warning:'warning', error:'warning'
    }[variant] || 'info');
    var out = '<div class="' + cls + '">';
    if(b.text) out += escHtml(b.text);
    out += '</div>';
    return out;
  }

  // very small inline markdown: **bold**, *italic*
  function escHtml(s){
    s = String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return s;
  }

  function whatsappShareUrl(post){
    var text = '*EatOuts blog: ' + (post.title || '') + '*\n\n';
    if(post.subtitle) text += post.subtitle + '\n';
    text += '\n';
    var first = firstTextBlock(post);
    if(first) text += first.slice(0, 120) + (first.length > 120 ? '…' : '') + '\n\n';
    text += 'Read on EatOuts: ' + window.location.href.split('#')[0] + '?post=' + (post.slug || '');
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }

  /* ---------- tag filter from URL hash ---------- */
  function readTagFromHash(){
    var h = window.location.hash;
    if(h.indexOf('#tag-') === 0){
      return h.slice(5).replace(/[^a-z0-9\-]/g, '').toLowerCase();
    }
    return null;
  }

  /* ---------- actions ---------- */
  function handleAction(act, target, event){
    if(act === 'blogHome'){
      goTimeline();
      return;
    }
    if(act === 'blogAdmin'){
      goAdmin();
      return;
    }
    if(act === 'clearSearch'){
      STATE.search = '';
      STATE.tagFilter = null;
      window.location.hash = '';
      render('timeline');
      return;
    }
    if(act === 'tagFilter'){
      var tag = (target && target.getAttribute('data-tag')) || (event && event.target && event.target.getAttribute('data-tag')) || '';
      STATE.tagFilter = tag || null;
      STATE.search = tag || '';
      if(tag){
        window.location.hash = '#tag-' + tag;
      }else{
        window.location.hash = '';
      }
      render('timeline');
      return;
    }
    if(act === 'tagSearch'){
      var t = (target && target.getAttribute('data-tag')) || (event && event.target && event.target.getAttribute('data-tag')) || '';
      STATE.tagFilter = t;
      STATE.search = t;
      window.location.hash = '#tag-' + t;
      render('timeline');
      return;
    }
    if(act === 'openPost'){
      var id = (target && target.getAttribute('data-post-id')) || (event && event.target && event.target.getAttribute('data-post-id'));
      if(id){
        var p = getPostById(id);
        if(p) openPost(p);
      }
      return;
    }
    if(act === 'copyLink'){
      var url = window.location.href.split('#')[0] + (window.location.search || '') + (window.location.hash || '');
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(url).then(function(){
            toast('Link copied');
          }).catch(function(){
            fallbackCopy(url);
          });
        }else{
          fallbackCopy(url);
        }
      }catch(e){
        fallbackCopy(url);
      }
      return;
    }
    // admin actions are handled by the admin extension
    if(typeof EatoutsBlog._adminHandle === 'function'){
      EatoutsBlog._adminHandle(act, target, event);
    }
  }

  function fallbackCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); toast('Link copied'); }
    catch(e){ toast('Copy failed'); }
    document.body.removeChild(ta);
  }

  /* ---------- navigation ---------- */
  function goTimeline(){
    STATE.view = 'timeline';
    STATE.search = '';
    STATE.tagFilter = null;
    window.location.hash = '';
    clearOgTags(document);
    render('timeline');
  }

  function openPost(post){
    STATE.view = 'post';
    STATE.currentPost = post;
    render('post', { post: post });
    // scroll top
    var s = container && container.querySelector('.scroll');
    if(s) s.scrollTop = 0;
  }

  function openPostBySlug(slug){
    if(!slug) return;
    var p = getPostBySlug(slug);
    if(!p){
      toast('Post not found');
      goTimeline();
      return;
    }
    openPost(p);
  }

  function goAdmin(){
    STATE.view = 'admin';
    render('admin');
  }

  function back(){
    if(STATE.view === 'post' || STATE.view === 'preview' || STATE.view === 'edit'){
      goTimeline();
      return;
    }
    if(STATE.view === 'admin'){
      goTimeline();
      return;
    }
    goTimeline();
  }

  function setSearch(v){
    STATE.search = v || '';
    // re-render timeline if we're on it
    if(STATE.view === 'timeline'){
      render('timeline');
    }
  }

  function setAdmin(v){
    STATE.admin = !!v;
    if(STATE.admin && STATE.view !== 'admin' && STATE.view !== 'edit'){
      goAdmin();
    }
  }

  function isAdmin(){
    return !!STATE.admin;
  }

  /* ---------- offline cache ---------- */
  function refreshCacheFromPublished(){
    var posts = getPublishedPosts();
    saveCache(posts);
    STATE.cache = { posts: posts, at: Date.now() };
  }

  /* ---------- init ---------- */
  function init(opts){
    container = opts && opts.mount || container;
    STATE.admin = !!opts.isAdmin;
    initialisePosts();
    // seed cache if empty
    var cache = loadCache();
    if(!cache || !cache.posts || !cache.posts.length){
      refreshCacheFromPublished();
    }else{
      STATE.cache = cache;
    }
    // read tag from hash if present
    var hashTag = readTagFromHash();
    if(hashTag){
      STATE.tagFilter = hashTag;
      STATE.search = hashTag;
    }
    render('timeline');
  }

  /* ---------- public API ---------- */
  window.EatoutsBlog = {
    init: init,
    isAdmin: isAdmin,
    setAdmin: setAdmin,
    back: back,
    handleAction: handleAction,
    setSearch: setSearch,
    openPost: openPost,
    openPostBySlug: openPostBySlug,
    goTimeline: goTimeline,
    goAdmin: goAdmin,
    getCurrentPost: function(){ return STATE.currentPost; },
    getPosts: function(){ return STATE.posts; },
    getPublishedPosts: getPublishedPosts,
    getPostById: getPostById,
    getPostBySlug: getPostBySlug,
    saveStore: saveStore,
    formatDate: formatDate,
    slugify: slugify,
    esc: esc,
    toast: toast,
    money: money,
    renderBlocks: renderBlocks,
    renderImageBlock: renderImageBlock,
    renderVideoBlock: renderVideoBlock,
    renderGalleryBlock: renderGalleryBlock,
    renderLinkBlock: renderLinkBlock,
    renderQuoteBlock: renderQuoteBlock,
    renderListBlock: renderListBlock,
    renderCalloutBlock: renderCalloutBlock,
    renderInline: renderInline,
    escHtml: escHtml,
    whatsappShareUrl: whatsappShareUrl,
    firstTextBlock: firstTextBlock,
    applyOgTags: applyOgTags,
    clearOgTags: clearOgTags,
    SLUG_SAFE: SLUG_SAFE,
    /* constants */
    POST_LIMIT: POST_LIMIT,
    BLOCK_LIMIT: BLOCK_LIMIT,
    VERSION_LIMIT: VERSION_LIMIT,
    CACHE_BYTES_LIMIT: CACHE_BYTES_LIMIT,
    POST_JSON_LIMIT: POST_JSON_LIMIT,
    OPS_KEY: OPS_KEY,
    CACHE_KEY: CACHE_KEY,
    /* shared helpers for admin extension */
    stateView: stateView,
    render: render,
    updateNav: updateNav,
    updateHeader: updateHeader,
    matchPost: matchPost,
    collectTags: collectTags,
    formatDate: formatDate,
    loadStore: loadStore,
    saveStore: saveStore,
    loadCache: loadCache,
    saveCache: saveCache,
    initialisePosts: initialisePosts,
    getPublishedPosts: getPublishedPosts,
    readTagFromHash: readTagFromHash,
    container: function(){ return container; },
    setContainer: function(c){ container = c; }
  };
})();
