/* ============================================================
   EATOUTS BLOG — ENGINE (PART 2: ADMIN)
   Post list, edit meta, block stack, tag input, publish,
   export, auto-save, version history, preview, size guards.
   Must load AFTER js/eatouts-blog-engine.js.
   ============================================================ */
(function(){
  'use strict';

  var B = window.EatoutsBlog;
  if(!B){
    console.error('EatoutsBlog not found — js/eatouts-blog-engine.js must load first.');
    return;
  }

  /* ---------- tag autocomplete state ---------- */
  var tagPool = null;

  function refreshTagPool(){
    tagPool = {};
    (B.getPosts() || []).forEach(function(p){
      (p.tags || []).forEach(function(t){
        if(t) tagPool[t.toLowerCase()] = t;
      });
    });
    // keep seeds in mind too
    (window.EATOUTS_BLOG_POSTS || []).forEach(function(p){
      (p.tags || []).forEach(function(t){
        if(t) tagPool[t.toLowerCase()] = t;
      });
    });
  }

  /* ---------- helpers ---------- */
  function uid(prefix){
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
  }

  function blockTypeLabel(type){
    return ({
      heading:'Heading', subheading:'Subheading', text:'Text',
      image:'Image', video:'Video', gallery:'Gallery',
      link:'Link', divider:'Divider', quote:'Quote',
      list:'List', callout:'Callout'
    }[type] || type);
  }

  function blockTypeIcon(type){
    return ({
      heading:'H2', subheading:'H3', text:'¶', image:'🖼', video:'▶',
      gallery:'⊞', link:'⇗', divider:'—', quote:'❝', list:'☰', callout:'▲'
    }[type] || '?');
  }

  function blockTypeFields(type){
    switch(type){
      case 'heading':
        return [{ key:'text', label:'Text', type:'text', placeholder:'Heading text' }];
      case 'subheading':
        return [{ key:'text', label:'Text', type:'text', placeholder:'Subheading text' }];
      case 'text':
        return [{ key:'text', label:'Text', type:'textarea', placeholder:'Write your paragraph… Use **bold** and *italic*.' }];
      case 'image':
        return [
          { key:'src', label:'Image URL', type:'text', placeholder:'https://…' },
          { key:'alt', label:'Alt text', type:'text', placeholder:'Description for screen readers' },
          { key:'caption', label:'Caption', type:'text', placeholder:'Optional caption' }
        ];
      case 'video':
        return [
          { key:'src', label:'Video URL', type:'text', placeholder:'https://…' },
          { key:'poster', label:'Poster image URL', type:'text', placeholder:'https://… (optional)' },
          { key:'caption', label:'Caption', type:'text', placeholder:'Optional caption' }
        ];
      case 'gallery':
        return [{ key:'images', label:'Images', type:'gallery', placeholder:'Add images below' }];
      case 'link':
        return [
          { key:'url', label:'URL', type:'text', placeholder:'https://…' },
          { key:'label', label:'Label', type:'text', placeholder:'Book a table' },
          { key:'description', label:'Description', type:'text', placeholder:'Optional blurb' }
        ];
      case 'divider':
        return [];
      case 'quote':
        return [
          { key:'text', label:'Quote', type:'textarea', placeholder:'The quote text' },
          { key:'attribution', label:'Attribution', type:'text', placeholder:'— Someone' }
        ];
      case 'list':
        return [
          { key:'ordered', label:'Ordered', type:'checkbox' },
          { key:'items', label:'Items', type:'textarea', placeholder:'One per line' }
        ];
      case 'callout':
        return [
          { key:'variant', label:'Variant', type:'select',
            options:[{value:'info',label:'Info'},{value:'success',label:'Success'},{value:'warning',label:'Warning'}] },
          { key:'text', label:'Text', type:'textarea', placeholder:'Callout text. Use **bold** and *italic*.' }
        ];
      default:
        return [{ key:'text', label:'Text', type:'text', placeholder:'Content' }];
    }
  }

  function buildDefaultBlock(type){
    var b = { type: type };
    var fields = blockTypeFields(type);
    fields.forEach(function(f){
      if(f.type === 'checkbox') b[f.key] = false;
      else if(f.type === 'select') b[f.key] = f.options && f.options[0].value;
      else if(f.type === 'textarea') b[f.key] = '';
      else if(f.key === 'images') b.images = [];
      else b[f.key] = '';
    });
    if(type === 'list' && !b.ordered) b.ordered = false;
    return b;
  }

  function hasBlockContent(b){
    if(!b) return false;
    switch(b.type){
      case 'heading': case 'subheading':
        return !!(b.text && b.text.trim());
      case 'text':
        return !!(b.text && b.text.trim());
      case 'image':
        return !!(b.src && b.src.trim());
      case 'video':
        return !!(b.src && b.src.trim());
      case 'gallery':
        return !!(b.images && b.images.length);
      case 'link':
        return !!(b.url && b.url.trim());
      case 'divider':
        return true;
      case 'quote':
        return !!(b.text && b.text.trim());
      case 'list':
        return !!(b.items && b.items.length);
      case 'callout':
        return !!(b.text && b.text.trim());
      default:
        return !!b.text;
    }
  }

  function toParagraphItems(value){
    if(!value) return [];
    return value.split('\n').map(function(s){ return s.replace(/^\s+|\s+$/g,''); }).filter(Boolean);
  }
  function fromParagraphItems(items){
    return (items || []).join('\n');
  }

  /* ---------- size guards ---------- */
  function checkPostSize(post, editing){
    // rough byte estimate
    var json = JSON.stringify(post);
    if(json.length > B.POST_JSON_LIMIT){
      toast('Post is too large (over ' + (B.POST_JSON_LIMIT/1024) + ' KB). Trim content or remove blocks.');
      return false;
    }
    if((B.getPosts() || []).length >= B.POST_LIMIT){
      toast('You have reached the post limit (' + B.POST_LIMIT + '). Edit an existing post or delete one.');
      return false;
    }
    return true;
  }

  function checkBlockLimit(blocks){
    if(blocks && blocks.length > B.BLOCK_LIMIT){
      toast('A post can have at most ' + B.BLOCK_LIMIT + ' blocks.');
      return false;
    }
    return true;
  }

  /* ---------- version history ---------- */
  function snapshot(post){
    var id = post.id;
    if(!id) return;
    var hist = B.history || {};
    if(!hist[id]) hist[id] = [];
    var entry = {
      at: Date.now(),
      title: post.title,
      slug: post.slug,
      subtitle: post.subtitle,
      coverImage: post.coverImage,
      coverCaption: post.coverCaption,
      tags: (post.tags || []).slice(),
      blocks: (post.blocks || []).map(function(b){
        return Object.assign({}, b);
      }),
      status: post.status,
      publishedAt: post.publishedAt
    };
    hist[id].push(entry);
    if(hist[id].length > B.VERSION_LIMIT){
      hist[id] = hist[id].slice(hist[id].length - B.VERSION_LIMIT);
    }
    B.history = hist;
    try{ localStorage.setItem(B.OPS_KEY, JSON.stringify({ posts:B.getPosts(), history:hist, updatedAt:Date.now() })); }catch(e){}
  }

  function renderVersionList(hist){
    if(!hist || !hist.length){
      return '<div class="empty-admin" style="padding:18px">No previous versions.</div>';
    }
    var h = '<div style="margin-bottom:12px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#a89a7e;font-weight:800">Previous versions</div>';
    h += '<div style="max-height:220px;overflow-y:auto;border:1px solid #ece7db;border-radius:10px;background:#fff">';
    var ordered = hist.slice().sort(function(a,b){ return b.at - a.at; });
    ordered.forEach(function(v, i){
      var d = B.formatDate(v.at);
      h += '<div style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid #f4efe4;cursor:pointer" data-ver="' + i + '">' +
        '<span style="flex:0 0 auto;font-size:11px;color:#a89a7e;font-weight:700">' + esc(i+1) + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:800;color:#1b1b1b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(v.title || '(no title)') + '</div>' +
          '<div style="font-size:11px;color:#a89a7e">' + esc(d) + ' · ' + (v.status === 'published' ? 'published' : 'draft') + '</div>' +
        '</div>' +
      '</div>';
    });
    h += '</div>';
    return h;
  }

  /* ---------- tag input ---------- */
  function renderTagInput(initial, onSave){
    refreshTagPool();
    var tags = (initial || []).slice();
    var h = '';
    h += '<div class="field" style="margin-bottom:0">' +
      '<label>Tags</label>' +
      '<div class="tag-input" id="tagInput">';
    tags.forEach(function(t, i){
      h += '<span class="tag-chip" data-tag-index="' + i + '">' +
        esc(t) + '<button type="button" data-remove-tag="' + i + '" aria-label="Remove tag">×</button></span>';
    });
    h += '<input id="tagInputField" type="text" placeholder="Type a tag, press Enter" autocomplete="off" value="">';
    h += '</div>';
    h += '<div class="hint">Press Enter or comma to add. Press Backspace on an empty field to remove the last tag. Existing tags autocomplete.</div>';
    h += '</div>';

    // render with input focused
    var wrapper = document.createElement('div');
    wrapper.innerHTML = h;
    var field = wrapper.querySelector('#tagInputField');
    if(field) field.focus();

    wrapper.querySelector('#tagInput').addEventListener('click', function(e){
      var t = e.target.closest('[data-remove-tag]');
      if(t){
        var idx = parseInt(t.getAttribute('data-remove-tag'), 10);
        if(!isNaN(idx) && tags.length > idx){
          tags.splice(idx, 1);
          renderTagInput(tags, onSave);
        }
        return;
      }
    });
    field.addEventListener('input', function(){
      var val = field.value;
      var suggestions = [];
      if(val.length >= 1){
        var low = val.toLowerCase();
        Object.keys(tagPool).forEach(function(k){
          if(k.indexOf(low) === 0) suggestions.push(tagPool[k]);
        });
      }
      // show suggestions as small chips below
      var parent = field.parentNode;
      var existing = parent.querySelector('.tag-suggestions');
      if(existing) existing.remove();
      if(suggestions.length && val.length > 0){
        var div = document.createElement('div');
        div.className = 'tag-suggestions';
        div.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;padding:6px 2px;');
        suggestions.slice(0, 8).forEach(function(s){
          var span = document.createElement('span');
          span.className = 'tag-chip';
          span.textContent = s;
          span.style.cssText = 'background:#fff;border-color:#c9a84c;color:#8a6a1a;cursor:pointer;font-size:11px;padding:3px 8px;border-radius:999px';
          span.onmousedown = function(e){ e.preventDefault(); tags.push(s); field.value = ''; renderTagInput(tags, onSave); };
          div.appendChild(span);
        });
        parent.appendChild(div);
      }
    });
    field.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ','){
        e.preventDefault();
        var v = field.value.replace(/,$/, '').trim();
        if(v){
          // normalise to existing tag if possible
          var low = v.toLowerCase();
          var existing = tagPool[low];
          if(existing && !tags.some(function(t){ return t.toLowerCase() === existing.toLowerCase(); })){
            tags.push(existing);
          }else if(!tags.some(function(t){ return t.toLowerCase() === low; })){
            tags.push(v);
          }
        }
        field.value = '';
        renderTagInput(tags, onSave);
        return;
      }
      if(e.key === 'Backspace' && !field.value && tags.length){
        tags.pop();
        renderTagInput(tags, onSave);
        return;
      }
      if(e.key === '_TAB_'){ /* placeholder for tab handling in modal */ }
    });
    field.addEventListener('blur', function(){
      var sug = wrapper.querySelector('.tag-suggestions');
      if(sug) setTimeout(function(){ if(sug.parentNode) sug.parentNode.removeChild(sug); }, 200);
    });

    return wrapper.innerHTML;
  }

  /* ---------- edit post ---------- */
  function renderEditPost(root, post){
    if(!post){
      // create new
      return renderEditPost(root, newPost());
    }
    var h = '';
    h += '<div class="admin-wrap">' +
      '<div class="admin-h1">Edit post</div>' +
      '<div class="admin-sub">Draft saves automatically. Use "Publish" when it is ready.</div>';

    // meta panel
    h += '<div class="edit-meta">';
    h += '<div class="field"><label>Title *</label>' +
      '<input id="f_title" type="text" value="' + esc(post.title || '') + '" placeholder="Post title"></div>';
    h += '<div class="field"><label>Slug (auto)</label>' +
      '<input id="f_slug" type="text" value="' + esc(post.slug || '') + '" placeholder="post-slug">' +
      '<div class="hint">URL-safe. Auto-filled from the title; edit freely.</div></div>';
    h += '<div class="field"><label>Subtitle (optional)</label>' +
      '<input id="f_subtitle" type="text" value="' + esc(post.subtitle || '') + '" placeholder="One-line summary"></div>';
    h += '<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div class="field"><label>Cover image URL</label>' +
        '<input id="f_cover" type="text" value="' + esc(post.coverImage || '') + '" placeholder="https://…"></div>' +
      '<div class="field"><label>Cover caption</label>' +
        '<input id="f_caption" type="text" value="' + esc(post.coverCaption || '') + '" placeholder="Optional"></div>' +
    '</div>';
    h += '<div class="field"><label>Status</label>' +
      '<label class="switch" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer">' +
        '<input type="checkbox" id="f_status" style="display:none">' +
        '<span class="track" style="width:44px;height:26px;background:#ddd;border-radius:999px;position:relative;transition:background .2s;flex:0 0 auto"></span>' +
        '<span class="track-text" style="font-size:12.5px;font-weight:700;flex:1">' +
          (post.status === 'published' ? 'Published' : 'Draft') + '</span>' +
      '</label>' +
      '<div class="hint">Published posts appear in the timeline. Draft posts are visible only to you.</div></div>';
    h += '<div class="field"><label>Tags</label></div>';
    h += renderTagInput(post.tags || [], function(tags){
      document.getElementById('f_tags')._ tags = tags;
      scheduleAutoSave();
    });
    h += '<input type="hidden" id="f_tags">';
    h += '</div>'; // edit-meta

    // block stack
    h += '<div class="subh">Blocks (' + (post.blocks ? post.blocks.length : 0) + ')</div>';
    h += '<div class="block-stack" id="blockStack">' + renderBlockStack(post.blocks || []) + '</div>';
    h += '<div class="add-block">' +
      '<div class="add-block-title">Add block</div>' +
      '<div class="add-block-grid">' +
        [['heading','H2','Add a heading'],['subheading','H3','Add a subheading'],['text','¶','Add text'],
         ['image','🖼','Add image'],['video','▶','Add video'],['gallery','⊞','Add gallery'],
         ['link','⇗','Add link'],['divider','—','Add divider'],['quote','❝','Add quote'],
         ['list','☰','Add list'],['callout','▲','Add callout']]
          .map(function(entry){
            return '<button type="button" data-add-block="' + entry[0] + '"><span>' + entry[1] + '</span>' + entry[2] + '</button>';
          }).join('') +
      '</div>' +
    '</div>';

    // actions
    h += '<div class="admin-bar">' +
      '<button class="btn ghost half" data-act="backFromEdit" type="button">← Back</button>' +
      '<button class="btn half" data-act="previewPost" type="button">Preview</button>' +
      (post.status === 'published'
        ? '<button class="btn half" data-act="unpublishPost" type="button">Unpublish</button>'
        : '<button class="btn gold half" data-act="publishPost" type="button">Publish</button>') +
      '<button class="btn primary full" data-act="saveDraft" type="button">Save</button>' +
    '</div>';

    // version history panel (collapsible)
    var hist = B.history && B.history[post.id];
    h += '<div style="margin-top:18px;border-top:1px solid #ece7db;padding-top:14px">' +
      '<div style="display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#a89a7e;font-weight:800;cursor:pointer" data-act="toggleHistory" type="button">' +
        '<span>Version history</span><span style="margin-left:auto" id="historyToggle">▾</span>' +
      '</div>' +
      '<div id="historyPanel" style="display:none;margin-top:10px">' +
        renderVersionList(hist || []) +
      '</div>' +
    '</div>';

    h += '</div>'; // admin-wrap
    root.innerHTML = h;
    bindEdit(root, post);
  }

  function renderBlockStack(blocks){
    if(!blocks || !blocks.length){
      return '<div class="empty-admin" style="padding:14px">No blocks yet. Add one below.</div>';
    }
    var h = '';
    blocks.forEach(function(b, i){
      h += '<div class="block-card" data-block-index="' + i + '">' +
        '<div class="block-head">' +
          '<span class="block-type">' + blockTypeIcon(b.type) + ' ' + blockTypeLabel(b.type) + '</span>' +
          '<span class="block-num">#' + (i+1) + '</span>' +
          '<div class="block-actions">' +
            '<button type="button" data-move-up="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">↑</button>' +
            '<button type="button" data-move-down="' + i + '"' + (i === blocks.length-1 ? ' disabled' : '') + ' aria-label="Move down">↓</button>' +
            '<button type="button" data-dup-block="' + i + '" aria-label="Duplicate">⎘</button>' +
            '<button type="button" class="danger" data-del-block="' + i + '" aria-label="Delete">×</button>' +
          '</div>' +
        '</div>' +
        '<div class="block-body">' + renderBlockEdit(b) + '</div>' +
      '</div>';
    });
    return h;
  }

  function renderBlockEdit(b){
    var fields = blockTypeFields(b.type);
    if(!fields.length){
      return '<div class="hint" style="font-size:11px;color:#a89a7e">No fields — just the block type.</div>';
    }
    var h = '';
    fields.forEach(function(f){
      if(f.type === 'gallery'){
        h += '<div class="field"><label>Images</label>' +
          '<div style="background:#faf8f2;border:1px solid #ece7db;border-radius:10px;padding:8px">' +
            (b.images && b.images.length
              ? b.images.map(function(img, i){
                  return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">' +
                    '<img src="' + esc(img.src) + '" alt="" style="width:40px;height:40px;border-radius:6px;object-fit:cover;background:#f4efe4">' +
                    '<span style="flex:1;font-size:12px;color:#3a3324;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(img.src) + '</span>' +
                    '<button type="button" data-del-img="' + i + '" style="color:#c43c3c;font-size:14px;padding:0 4px">×</button>' +
                  '</div>';
                }).join('')
              : '<div class="hint" style="padding:4px 0">No images yet. Add below.</div>') +
          '<button class="btn sm ghost" type="button" data-add-img style="margin-top:8px">+ Add image</button>' +
          '</div></div>';
      }
      else if(f.type === 'checkbox'){
        h += '<label class="switch" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer">' +
          '<input type="checkbox" id="f_' + f.key + '" style="display:none">' +
          '<span class="track" style="width:44px;height:26px;background:#ddd;border-radius:999px;position:relative;transition:background .2s;flex:0 0 auto"></span>' +
          '<span class="track-text" style="font-size:12.5px;font-weight:700;flex:1">' +
            (f.label || '') + '</span></label>';
      }
      else if(f.type === 'select'){
        var opts = (f.options || []).map(function(o){
          var v = typeof o === 'string' ? o : o.value;
          var lbl = typeof o === 'string' ? o : o.label;
          return '<option value="' + esc(v) + '"' + (v === b[f.key] ? ' selected' : '') + '>' + esc(lbl) + '</option>';
        }).join('');
        h += '<div class="field"><label>' + esc(f.label) + '</label>' +
          '<select id="f_' + f.key + '">' + opts + '</select></div>';
      }
      else if(f.type === 'textarea'){
        var val = (Array.isArray(b[f.key]) ? fromParagraphItems(b[f.key]) : String(b[f.key] || ''));
        h += '<div class="field"><label>' + esc(f.label) + '</label>' +
          '<textarea id="f_' + f.key + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(val) + '</textarea>' +
          (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
      }
      else {
        var val = String(b[f.key] || '');
        h += '<div class="field"><label>' + esc(f.label) + '</label>' +
          '<input id="f_' + f.key + '" type="text" value="' + esc(val) + '" placeholder="' + esc(f.placeholder || '') + '">' +
          (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
      }
    });
    return h;
  }

  function bindEdit(root, post){
    // auto-save on input
    root.querySelectorAll('input:not([type=checkbox]):not([type=hidden]), textarea').forEach(function(el){
      el.addEventListener('input', function(){
        if(el.id === 'f_title' || el.id === 'f_slug' || el.id === 'f_subtitle' ||
           el.id === 'f_cover' || el.id === 'f_caption'){
          scheduleAutoSave();
        }
      });
      el.addEventListener('change', function(){
        if(el.type === 'checkbox'){
          scheduleAutoSave();
        }
      });
    });

    // live slug sync
    var titleEl = document.getElementById('f_title');
    var slugEl = document.getElementById('f_slug');
    if(titleEl){
      titleEl.addEventListener('input', function(){
        if(!slugEl._touched){
          slugEl.value = B.slugify(titleEl.value) || '';
        }
        scheduleAutoSave();
      });
    }
    if(slugEl){
      slugEl.addEventListener('input', function(){
        slugEl._touched = 1;
        scheduleAutoSave();
      });
    }

    // status toggle
    var statusEl = document.getElementById('f_status');
    var statusTrack = root.querySelector('.switch .track');
    var statusText = root.querySelector('.switch .track-text');
    if(statusEl && statusTrack && statusText){
      statusEl.addEventListener('change', function(){
        var pub = statusEl.checked;
        post.status = pub ? 'published' : 'draft';
        if(pub && !post.publishedAt){
          post.publishedAt = Date.now();
        }else if(!pub){
          post.publishedAt = null;
        }
        statusText.textContent = pub ? 'Published' : 'Draft';
        statusTrack.style.background = pub ? '#17834b' : '#ddd';
        scheduleAutoSave();
      });
      statusEl.checked = !!post.status && post.status === 'published';
      // init visual
      var pub = !!post.status && post.status === 'published';
      statusText.textContent = pub ? 'Published' : 'Draft';
      statusTrack.style.background = pub ? '#17834b' : '#ddd';
    }

    // tag input: wire the hidden field + remove buttons
    var tagInput = root.querySelector('#tagInput');
    if(tagInput){
      tagInput.querySelectorAll('[data-remove-tag]').forEach(function(b){
        b.onclick = function(){
          var idx = parseInt(b.getAttribute('data-remove-tag'), 10);
          var tags = (post.tags || []).slice();
          if(!isNaN(idx) && tags.length > idx){
            tags.splice(idx, 1);
            post.tags = tags;
            renderTagInput(tags, function(tags2){
              post.tags = tags2;
              scheduleAutoSave();
            });
          }
        };
      });
      var field = root.querySelector('#tagInputField');
      if(field){
        field.oninput = function(){
          // live preview of typed tag; we handle add on Enter in renderTagInput
          scheduleAutoSave();
        };
      }
    }

    // block stack actions
    root.querySelector('#blockStack').addEventListener('click', function(e){
      var t = e.target.closest('[data-act]') || e.target.closest('[data-move-up],[data-move-down],[data-dup-block],[data-del-block],[data-add-img],[data-del-img],[data-add-block]');
      if(!t) return;
      var addBlock = t.getAttribute('data-add-block');
      if(addBlock){
        e.preventDefault();
        addBlockTo(post, addBlock);
        return;
      }
      var imgIdx = t.getAttribute('data-del-img');
      if(imgIdx !== null){
        e.preventDefault();
        var i = parseInt(imgIdx, 10);
        if(!isNaN(i) && post.blocks){
          var blk = post.blocks.filter(function(x){ return x.type === 'gallery'; })[0];
          if(blk && blk.images && blk.images.length > i){
            blk.images.splice(i, 1);
            renderEditPost(root, post);
          }
        }
        return;
      }
      var addImg = t.getAttribute('data-add-img');
      if(addImg){
        e.preventDefault();
        var blk = post.blocks.filter(function(x){ return x.type === 'gallery'; })[0];
        if(blk){
          blk.images.push({ src:'', alt:'' });
          renderEditPost(root, post);
        }else{
          // add a gallery block with one empty image
          var gb = { type:'gallery', images:[{ src:'', alt:'' }] };
          post.blocks.push(gb);
          renderEditPost(root, post);
        }
        return;
      }
      var moveUp = t.getAttribute('data-move-up');
      if(moveUp !== null){
        e.preventDefault();
        var i = parseInt(moveUp, 10);
        if(!isNaN(i) && i > 0 && post.blocks){
          var tmp = post.blocks[i-1]; post.blocks[i-1] = post.blocks[i]; post.blocks[i] = tmp;
          renderEditPost(root, post);
        }
        return;
      }
      var moveDown = t.getAttribute('data-move-down');
      if(moveDown !== null){
        e.preventDefault();
        var i = parseInt(moveDown, 10);
        if(!isNaN(i) && i < (post.blocks.length-1) && post.blocks){
          var tmp = post.blocks[i+1]; post.blocks[i+1] = post.blocks[i]; post.blocks[i] = tmp;
          renderEditPost(root, post);
        }
        return;
      }
      var dup = t.getAttribute('data-dup-block');
      if(dup !== null){
        e.preventDefault();
        var i = parseInt(dup, 10);
        if(!isNaN(i) && post.blocks){
          var orig = post.blocks[i];
          var copy = Object.assign({}, orig, { id: uid('blk') });
          if(copy.blocks) copy.blocks = copy.blocks.slice();
          if(copy.images) copy.images = copy.images.map(function(x){ return Object.assign({}, x); });
          post.blocks.splice(i+1, 0, copy);
          renderEditPost(root, post);
        }
        return;
      }
      var del = t.getAttribute('data-del-block');
      if(del !== null){
        e.preventDefault();
        var i = parseInt(del, 10);
        if(!isNaN(i) && post.blocks && post.blocks.length > 1){
          post.blocks.splice(i, 1);
          renderEditPost(root, post);
        }else if(post.blocks && post.blocks.length <= 1){
          toast('A post needs at least one block');
        }
        return;
      }
      var imgAdd = t.getAttribute('data-add-img');
      if(imgAdd !== null){
        // handled above
        return;
      }
    });

    // gallery image add inside block body
    root.querySelectorAll('[data-add-img]').forEach(function(b){
      b.onclick = function(){
        var stack = root.querySelector('#blockStack');
        var cards = stack.querySelectorAll('.block-card');
        // find which card this button belongs to
        var card = b.closest('.block-card');
        if(card){
          var idx = parseInt(card.getAttribute('data-block-index'), 10);
          if(!isNaN(idx) && post.blocks && post.blocks[idx]){
            var blk = post.blocks[idx];
            if(blk.type === 'gallery'){
              blk.images.push({ src:'', alt:'' });
              renderEditPost(root, post);
            }
          }
        }
      };
    });

    // gallery image remove inside block body
    root.querySelectorAll('[data-del-img]').forEach(function(b){
      b.onclick = function(){
        var idx = parseInt(b.getAttribute('data-del-img'), 10);
        if(!isNaN(idx) && post.blocks){
          var blk = post.blocks.filter(function(x){ return x.type === 'gallery'; })[0];
          if(blk && blk.images && blk.images.length > idx){
            blk.images.splice(idx, 1);
            renderEditPost(root, post);
          }
        }
      };
    });

    // version history toggle
    var histToggle = root.querySelector('[data-act=toggleHistory]');
    var histPanel = root.querySelector('#historyPanel');
    if(histToggle && histPanel){
      histToggle.onclick = function(){
        var on = histPanel.style.display !== 'none';
        histPanel.style.display = on ? 'none' : 'block';
        histToggle.querySelector('#historyToggle').textContent = on ? '▾' : '▸';
      };
    }

    // action buttons
    root.querySelector('[data-act=saveDraft]').onclick = function(){
      saveDraft(post, root);
    };
    root.querySelector('[data-act=previewPost]').onclick = function(){
      previewPost(post, root);
    };
    root.querySelector('[data-act=publishPost]').onclick = function(){
      publishPost(post, root);
    };
    root.querySelector('[data-act=unpublishPost]').onclick = function(){
      unpublishPost(post, root);
    };
    root.querySelector('[data-act=backFromEdit]').onclick = function(){
      goAdmin();
    };
  }

  /* ---------- block add ---------- */
  function addBlockTo(post, type){
    if(!checkBlockLimit(post.blocks)){
      return;
    }
    var b = buildDefaultBlock(type);
    // if this is a gallery block, start with one empty image
    if(type === 'gallery'){
      b.images = [{ src:'', alt:'' }];
    }
    post.blocks.push(b);
    renderEditPost(B.container() || document.getElementById('viewport'), post);
  }

  /* ---------- save / publish / unpublish ---------- */
  function saveDraft(post, root){
    snapshot(post);
    var merged = mergePostIntoStore(post);
    saveAll();
    toast('Draft saved');
    goAdmin();
  }

  function publishPost(post, root){
    // snapshot before change
    snapshot(post);
    post.status = 'published';
    post.publishedAt = Date.now();
    if(!post.slug){
      post.slug = B.slugify(post.title) || uid('post');
    }
    if(!checkPostSize(post, true)) return;
    mergePostIntoStore(post);
    saveAll();
    refreshCacheFromPublished();
    toast('Published');
    // reload OG for timeline + open the post
    var p = getPostById(post.id) || getPostBySlug(post.slug);
    if(p){
      STATE.currentPost = p;
      render('post', { post: p });
    }else{
      goAdmin();
    }
  }

  function unpublishPost(post, root){
    snapshot(post);
    post.status = 'draft';
    post.publishedAt = null;
    mergePostIntoStore(post);
    saveAll();
    refreshCacheFromPublished();
    toast('Unpublished');
    goAdmin();
  }

  function mergePostIntoStore(post){
    var list = B.getPosts();
    var idx = list.findIndex(function(x){ return x && x.id === post.id; });
    if(idx >= 0){
      list[idx] = Object.assign({}, list[idx], post, {
        updatedAt: Date.now()
      });
    }else{
      var newPost = Object.assign({}, post, {
        id: post.id || uid('post'),
        createdAt: post.createdAt || Date.now(),
        updatedAt: Date.now()
      });
      list.push(newPost);
    }
    STATE.posts = list;
    return list;
  }

  function newPost(){
    return {
      id: uid('post'),
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      title: '',
      slug: '',
      subtitle: '',
      coverImage: '',
      coverCaption: '',
      tags: [],
      blocks: [
        { type:'heading', text:'' },
        { type:'text', text:'' }
      ]
    };
  }

  function saveAll(){
    B.saveStore();
  }

  /* ---------- auto-save ---------- */
  function scheduleAutoSave(){
    if(B._autoTimer) clearTimeout(B._autoTimer);
    B._autoTimer = setTimeout(function(){
      var root = B.container();
      if(root && root.id === 'viewport' && STATE.view === 'edit'){
        var post = STATE.currentPost;
        if(post && post.id){
          snapshot(post);
          mergePostIntoStore(post);
          saveAll();
        }
      }
    }, 3000);
  }

  /* ---------- preview ---------- */
  function previewPost(post, root){
    var clone = Object.assign({}, post, {
      blocks: (post.blocks || []).map(function(b){ return Object.assign({}, b); })
    });
    STATE.view = 'preview';
    render('preview', { post: clone });
  }

  function renderPostPreview(root, post){
    // reuse post view but with an overlay header
    var inner = document.createElement('div');
    inner.style.cssText = 'background:#fff;border-radius:16px;width:100%;max-width:640px;overflow:hidden;display:flex;flex-direction:column;margin-top:14px';
    var head = document.createElement('div');
    head.style.cssText = 'padding:14px 18px;border-bottom:1px solid #ece7db;display:flex;align-items:center;gap:10px';
    var h3 = document.createElement('h3');
    h3.textContent = 'Preview';
    h3.style.cssText = 'margin:0;font-size:13.5px;font-weight:900;flex:1';
    var close = document.createElement('button');
    close.textContent = 'Close';
    close.type = 'button';
    close.style.cssText = 'padding:8px 14px;border-radius:10px;background:#f7f4ec;border:1px solid #ece7db;font-size:12.5px;font-weight:800;cursor:pointer';
    close.onclick = function(){ goAdmin(); };
    head.appendChild(h3);
    head.appendChild(close);
    inner.appendChild(head);
    var body = document.createElement('div');
    body.style.cssText = 'overflow-y:auto;flex:1;padding:0';
    var tmp = document.createElement('div');
    renderPostView(tmp, post);
    var scroll = tmp.querySelector('.scroll');
    if(scroll){
      while(scroll.firstChild) body.appendChild(scroll.firstChild);
    }else{
      while(tmp.firstChild) body.appendChild(tmp.firstChild);
    }
    inner.appendChild(body);
    var scrim = document.createElement('div');
    scrim.style.cssText = 'position:fixed;inset:0;background:rgba(20,18,12,.55);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:14px';
    scrim.appendChild(inner);
    root.innerHTML = '';
    root.appendChild(scrim);
    updateNav('preview');
    var page = document.getElementById('hdrPage');
    if(page) page.textContent = 'Preview';
  }

  /* ---------- post list (admin) ---------- */
  function renderAdmin(root){
    refreshTagPool();
    var posts = (B.getPosts() || []).slice().sort(function(a,b){
      var da = (a.publishedAt || a.updatedAt || 0);
      var db = (b.publishedAt || b.updatedAt || 0);
      return db - da;
    });
    var h = '<div class="admin-wrap">';
    h += '<div class="admin-h1">Blog admin</div>';
    h += '<div class="admin-sub">' + posts.length + ' post' + (posts.length === 1 ? '' : 's') +
      ' · ' + B.getPublishedPosts().length + ' published · ' +
      (B.POST_LIMIT - posts.length) + ' slots left</div>';

    if(!posts.length){
      h += '<div class="empty-admin">No posts yet. Create your first one.</div>' +
        '<button class="btn primary full" data-act="newPost" type="button" style="margin-top:14px">+ New post</button>';
      h += '</div>';
      root.innerHTML = h;
      root.querySelector('[data-act=newPost]').onclick = function(){
        editNewPost();
      };
      return;
    }

    h += '<div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn primary" data-act="newPost" type="button">+ New post</button>' +
      '<button class="btn gold" data-act="exportPosts" type="button">Export posts</button>' +
      '<button class="btn wa" data-act="shareBlog" type="button">Share blog</button>' +
    '</div>';

    h += '<div style="border-top:1px solid #ece7db;padding-top:12px">';
    posts.forEach(function(p){
      var date = p.publishedAt ? B.formatDate(p.publishedAt) : (p.updatedAt ? B.formatDate(p.updatedAt) : '');
      var thumb = p.coverImage
        ? '<img class="admin-post-thumb" src="' + esc(p.coverImage) + '" alt="">'
        : '<div class="admin-post-thumb"><div class="placeholder">¶</div></div>';
      h += '<div class="admin-post-row" data-post-id="' + esc(p.id) + '" data-act="editPost">' +
        thumb +
        '<div class="admin-post-info">' +
          '<div class="admin-post-title">' + esc(p.title || '(no title)') + '</div>' +
          '<div class="admin-post-meta">' + esc(date) + (p.slug ? ' · ' + esc(p.slug) : '') + '</div>' +
        '</div>' +
        '<span class="admin-post-status ' + (p.status === 'published' ? 'published' : 'draft') + '">' +
          (p.status === 'published' ? 'Published' : 'Draft') + '</span>' +
      '</div>';
    });
    h += '</div>';

    h += '<div style="margin-top:18px;border-top:1px solid #ece7db;padding-top:12px">' +
      '<div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#a89a7e;font-weight:800">Share the blog</div>' +
      '<div style="margin-top:8px;font-size:12.5px;color:#3a3324;line-height:1.55">' +
        'Share this page on WhatsApp — it opens your chat list so you pick who receives it. ' +
        'Use it for the link to the blog itself, or share a specific post directly from its page.</div>' +
    '</div>';

    h += '</div>';
    root.innerHTML = h;
  }

  /* ---------- actions ---------- */
  function adminHandle(act, target, event){
    if(act === 'newPost'){
      editNewPost();
      return;
    }
    if(act === 'editPost'){
      var id = (target && target.getAttribute('data-post-id')) || (event && event.target && event.target.getAttribute('data-post-id'));
      if(id){
        var p = B.getPostById(id);
        if(p) editExistingPost(p);
      }
      return;
    }
    if(act === 'exportPosts'){
      exportPosts();
      return;
    }
    if(act === 'shareBlog'){
      shareBlog();
      return;
    }
    if(act === 'saveDraft' || act === 'previewPost' || act === 'publishPost' || act === 'unpublishPost'){
      // handled inline in bindEdit
      return;
    }
    if(act === 'backFromEdit'){
      goAdmin();
      return;
    }
  }

  function editNewPost(){
    var post = newPost();
    STATE.currentPost = post;
    STATE.editId = post.id;
    STATE.view = 'edit';
    render('edit', { post: post });
  }

  function editExistingPost(post){
    STATE.currentPost = post;
    STATE.editId = post.id;
    STATE.view = 'edit';
    render('edit', { post: post });
  }

  function goAdmin(){
    STATE.view = 'admin';
    render('admin');
  }

  function goTimeline(){
    STATE.view = 'timeline';
    STATE.currentPost = null;
    STATE.editId = null;
    window.location.hash = '';
    clearOgTags(document);
    render('timeline');
  }

  /* ---------- export ---------- */
  function exportPosts(){
    var published = B.getPublishedPosts();
    if(!published.length){
      toast('No published posts to export');
      return;
    }
    var data = published.map(function(p){
      return {
        id: p.id,
        slug: p.slug || B.slugify(p.title) || '',
        title: p.title,
        subtitle: p.subtitle || '',
        coverImage: p.coverImage || '',
        coverCaption: p.coverCaption || '',
        tags: (p.tags || []).slice(),
        publishedAt: p.publishedAt || null,
        blocks: (p.blocks || []).map(function(b){ return Object.assign({}, b); })
      };
    });
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type:'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'blog_posts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
    toast('Exported ' + data.length + ' posts');
  }

  /* ---------- share blog ---------- */
  function shareBlog(){
    var url = window.location.href.split('#')[0] + (window.location.search || '');
    var text = '*EatOuts Blog*\n\n' +
      'Stories, guides, and honest updates from Botswana\'s restaurant scene.\n\n' +
      url;
    window.location.href = 'https://wa.me/?text=' + encodeURIComponent(text);
  }

  /* ---------- attach admin handler ---------- */
  B._adminHandle = adminHandle;
  B.editNewPost = editNewPost;
  B.editExistingPost = editExistingPost;
  B.exportPosts = exportPosts;
  B.shareBlog = shareBlog;
  B.refreshTagPool = refreshTagPool;
  B.snapshot = snapshot;
  B.renderVersionList = renderVersionList;
  B.buildDefaultBlock = buildDefaultBlock;
  B.blockTypeFields = blockTypeFields;
  B.blockTypeLabel = blockTypeLabel;
  B.blockTypeIcon = blockTypeIcon;
  B.hasBlockContent = hasBlockContent;
  B.checkPostSize = checkPostSize;
  B.checkBlockLimit = checkBlockLimit;
  B.addBlockTo = addBlockTo;
  B.renderTagInput = renderTagInput;
  B.previewPost = previewPost;
  B.saveDraft = saveDraft;
  B.publishPost = publishPost;
  B.unpublishPost = unpublishPost;
  B.mergePostIntoStore = mergePostIntoStore;
  B.newPost = newPost;
  B.goAdmin = goAdmin;
  B.goTimeline = goTimeline;
  B.renderEditPost = renderEditPost;
  B.renderAdmin = renderAdmin;
  B.renderPostPreview = renderPostPreview;
  B.renderBlockStack = renderBlockStack;
  B.renderBlockEdit = renderBlockEdit;
  B.scheduleAutoSave = scheduleAutoSave;

  // expose the block type list for the add-block grid in the HTML if it wants it
  B.BLOCK_TYPES = [
    { type:'heading', label:'Heading', icon:'H2' },
    { type:'subheading', label:'Subheading', icon:'H3' },
    { type:'text', label:'Text', icon:'¶' },
    { type:'image', label:'Image', icon:'🖼' },
    { type:'video', label:'Video', icon:'▶' },
    { type:'gallery', label:'Gallery', icon:'⊞' },
    { type:'link', label:'Link', icon:'⇗' },
    { type:'divider', label:'Divider', icon:'—' },
    { type:'quote', label:'Quote', icon:'❝' },
    { type:'list', label:'List', icon:'☰' },
    { type:'callout', label:'Callout', icon:'▲' }
  ];
})();
