/* Shared UI/runtime for the EatOuts manager / onboarding / admin pages.
   Renders the platform's canonical shell (#shell > .topbar + .app + .appnav)
   with a role-based bottom navigation, and talks to the namespaced manager
   store (EatoutsMgrDB) and the role layer on EatoutsAuth. */
(function(){
  const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const money=n=>`${(EatoutsMgrDB.get().settings||{}).currency||"BWP"} ${Number(n||0).toFixed(2)}`;
  const qs=s=>document.querySelector(s);
  function toast(msg){let x=qs("#eo-toast");if(!x){x=document.createElement("div");x.id="eo-toast";document.body.appendChild(x)}x.textContent=msg;x.classList.add("show");clearTimeout(window.__eoToast);window.__eoToast=setTimeout(()=>x.classList.remove("show"),2200)}
  function currentUser(){return window.EatoutsAuth&&EatoutsAuth.getUser?EatoutsAuth.getUser():null}
  function business(){return window.EatoutsAuth&&EatoutsAuth.getActiveBusiness?EatoutsAuth.getActiveBusiness():null}

  /* ---- role-based bottom navigation presets ---- */
  const NAV={
    public:[
      ["index.html#promos","Promos"],
      ["index.html#restaurants","Restaurants"],
      ["index.html#reserve","Reserve"],
      ["index.html#gallery","Gallery"],
      ["index.html#about","About"]
    ],
    customer:[
      ["index.html#promos","Promos"],
      ["eatouts-favourites.html","Saved"],
      ["eatouts-orders.html","Orders"],
      ["eatouts-addresses.html","Addresses"],
      ["eatouts-profile.html","Profile"]
    ],
    operator:[
      ["operator-dashboard1.html","Dashboard"],
      ["order-manager.html","Orders"],
      ["menu-onboarding.html","Menu"],
      ["staff-manager.html","Staff"],
      ["operator-dashboard1.html?tab=settings","More"]
    ],
    admin:[
      ["eatouts-admin-dashboard.html","Admin"],
      ["eatouts-users-manager.html","Users"],
      ["feedback-manager.html","Feedback"],
      ["eatouts-platform-analytics.html","Analytics"],
      ["eatouts-settings.html","Settings"]
    ]
  };
  function roleGroup(){
    /* A regular-user (customer) session lives in its own store. Prefer the
       customer nav for it, but never hijack a separate manager session if
       both happen to be present in the same browser. */
    if(window.EatoutsCustomer&&EatoutsCustomer.getUser&&EatoutsCustomer.getUser()){
      const cu=EatoutsCustomer.getUser();
      const mu=currentUser();
      if(!mu||mu.id===cu.id)return "customer";
    }
    const u=currentUser();
    if(!u)return "public";
    const r=u.roles||[];
    const isPlatform = u.type==="platform_admin"
      || (u.platformRole&&/^(platform_|staff_)/.test(u.platformRole))
      || r.some(x=>/^(platform_|staff_)/.test(String(x))||String(x)==="super_admin"||String(x)==="moderator");
    if(isPlatform)return "admin";
    if(u.type==="customer")return "customer";
    if(u.type==="supplier")return "operator";
    return "operator";
  }
  function homeFor(group){
    if(group==="admin")return "eatouts-admin-dashboard.html";
    if(group==="operator"){
      const u=currentUser();
      if(window.EatoutsAuth&&EatoutsAuth.routeFor){try{const r=EatoutsAuth.routeFor(u);if(r)return r}catch(e){}}
      return "operator-dashboard1.html";
    }
    return "index.html#promos";
  }
  function ensureDemo(){
    if(!EatoutsAuth.isLoggedIn()){
      const seed=EatoutsUsers.find("u-owner");
      if(seed){EatoutsAuth.startSession(seed)}else{localStorage.setItem(EatoutsAuth.SESSION,"u-owner");localStorage.setItem(EatoutsAuth.BUSINESS,"biz-restaurant")}
    }
  }
  function guard(opts={}){
    /* Regular-user session: satisfies a "customer" area gate directly, so a
       signed-in customer is never pushed into the manager demo session. */
    const cu=(window.EatoutsCustomer&&EatoutsCustomer.getUser)?EatoutsCustomer.getUser():null;
    if(cu&&!opts.roles)return cu;
    if(cu&&opts.roles&&opts.roles.length&&opts.roles.some(r=>r==="customer"||r==="customer:*"))return cu;
    const u=currentUser();
    /* A role-gated area needs a real session: never auto-seed the demo owner
       into it, or guests land inside customer/manager pages as the demo owner. */
    if(!u&&opts.roles&&opts.roles.length){location.href="eatouts-login.html";return null}
    if(!u){if(opts.demo!==false){ensureDemo();return currentUser()}location.href="eatouts-login.html";return null}
    if(opts.roles&&opts.roles.length&&!opts.roles.some(r=>EatoutsAuth.hasRole(r))){document.body.innerHTML=`<main class="blocked"><h1>Access restricted</h1><p>Your current account does not have permission for this area.</p><a class="btn primary" href="eatouts-login.html">Sign in</a></main>`;return null}
    return u
  }
  function currentFile(){return (location.pathname.split("/").pop()||"")}
  function shell(title,subtitle,content,opts={}){
    const group=opts.group||roleGroup();
    const nav=opts.nav||NAV[group];
    const here=currentFile();
    const navHtml=nav.map(([href,label])=>{
      const file=href.split("#")[0];
      const on=file&&file===here;
      return `<a href="${href}"${on?' class="on"':''}>${esc(label)}</a>`;
    }).join("");
    const b=business();
    const chip=opts.section||(b?b.name:"EatOuts");
    const back=opts.back||homeFor(group);
    document.title=`${title} · EatOuts`;
    return `<div id="shell"><header class="topbar"><a class="brand" href="${back}"><img src="assets/logo/EatOuts_Logo.png" alt="EatOuts"></a><div class="hdr-right"><span class="hdr-chip">${esc(chip)}</span><button class="hdr-exit" type="button" data-action="logout">Exit</button></div></header><main class="app"><div class="page-head"><div><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:""}</div>${opts.action||""}</div>${content}</main><nav class="appnav">${navHtml}</nav></div>`
  }
  function card(title,body,cls=""){return `<section class="card ${cls}"><div class="card-title">${esc(title)}</div>${body}</section>`}
  function metric(label,value,note=""){return `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`}
  function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
  function status(s){return `<span class="status ${String(s).replace(/\s+/g,"-").toLowerCase()}">${esc(s)}</span>`}
  function formField(name,label,type="text",value="",extra=""){return `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`}
  function selectField(name,label,options,value=""){return `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}">${options.map(o=>`<option value="${esc(o)}" ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select></label>`}
  /* ---- Phase 8 safety/UX helpers (shared, non-breaking) ---- */
  function uid(prefix){return (prefix||"id")+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
  /* Normalize a phone number for matching: digits only, drop a leading 267. */
  function phone(v){var d=String(v==null?"":v).replace(/\D/g,"");if(d.length>8&&d.slice(0,3)==="267")d=d.slice(3);return d}
  /* Readable display form while storing/ matching on the normalized value. */
  function phoneDisplay(v){var d=String(v==null?"":v).replace(/\D/g,"");if(!d)return "";if(d.length>8&&d.slice(0,3)==="267")d=d.slice(3);if(d.length===8)return "+267 "+d.slice(0,2)+" "+d.slice(2,5)+" "+d.slice(5);return String(v)}
  /* International digits (country code kept) for wa.me / tel: links. */
  function phoneIntl(v){var d=String(v==null?"":v).replace(/\D/g,"");if(d.length===8)d="267"+d;if(d.length===9&&d[0]==="0")d="267"+d.slice(1);return d}
  /* Paginate a list: 50 rows per page by default (Phase 8). */
  function page(rows,pageNo,size){var s=Number(size)>0?Number(size):50;var all=Array.isArray(rows)?rows:[];var total=all.length;var pages=Math.max(1,Math.ceil(total/s));var p=Math.min(Math.max(1,Number(pageNo)||1),pages);return {rows:all.slice((p-1)*s,p*s),page:p,pages:pages,size:s,total:total,hasPrev:p>1,hasNext:p<pages}}
  /* Pagination controls. Click target exposes state attr (default data-page). */
  function pager(state,attr){attr=attr||"data-page";if(!state||state.pages<=1)return "";var h='<div class="actions" style="justify-content:center;align-items:center;gap:8px">';if(state.hasPrev)h+='<button class="btn" type="button" '+attr+'="'+(state.page-1)+'">\u2039 Prev</button>';h+='<span class="minor">Page '+state.page+' of '+state.pages+' \u00b7 '+state.total+' records</span>';if(state.hasNext)h+='<button class="btn" type="button" '+attr+'="'+(state.page+1)+'">Next \u203a</button>';return h+'</div>'}
  /* Standard empty state. */
  function empty(msg,hint){return '<div class="empty"><strong>'+esc(msg||"Nothing here yet")+'</strong>'+(hint?'<p>'+esc(hint)+'</p>':'')+'</div>'}
  /* Explicit confirmation for destructive actions. */
  function confirmAction(msg){try{return window.confirm(String(msg||"Are you sure?"))}catch(e){return true}}
  function logout(){if(EatoutsAuth.logoutManager)EatoutsAuth.logoutManager();else EatoutsAuth.logout();location.href="eatouts-login.html"}
  function bindCommon(){document.addEventListener("click",e=>{const a=e.target.closest("[data-action]");if(!a)return;const act=a.dataset.action;if(act==="logout"){logout()}if(act==="back")history.back();if(act==="reset-demo"){EatoutsMgrDB.reset();toast("Demo data reset")}});if(window.EatoutsAnalytics){try{EatoutsAnalytics.track("page.view",{file:currentFile()})}catch(e){}}}
  window.EO={esc,money,toast,currentUser,business,guard,shell,card,metric,table,status,formField,selectField,bindCommon,NAV,uid,phone,phoneDisplay,phoneIntl,page,pager,empty,confirm:confirmAction,ask:confirmAction};
  document.addEventListener("DOMContentLoaded",bindCommon);
})();
