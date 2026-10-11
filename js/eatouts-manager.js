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
      ["restaurant-dashboard.html","Dashboard"],
      ["order-manager.html","Orders"],
      ["menu-onboarding.html","Menu"],
      ["staff-manager.html","Staff"],
      ["eatouts-settings.html","More"]
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
    const u=currentUser();
    if(!u)return "public";
    const r=u.roles||[];
    if(r.some(x=>String(x).indexOf("platform_")===0)||u.type==="platform_admin")return "admin";
    if(u.type==="customer")return "customer";
    if(u.type==="supplier")return "operator";
    return "operator";
  }
  function homeFor(group){
    if(group==="admin")return "eatouts-admin-dashboard.html";
    if(group==="operator")return "restaurant-dashboard.html";
    return "index.html#promos";
  }
  function ensureDemo(){
    if(!EatoutsAuth.isLoggedIn()){localStorage.setItem(EatoutsAuth.SESSION,"u-owner");localStorage.setItem(EatoutsAuth.BUSINESS,"biz-restaurant")}
  }
  function guard(opts={}){
    const u=currentUser();
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
  function logout(){if(EatoutsAuth.logoutManager)EatoutsAuth.logoutManager();else EatoutsAuth.logout();location.href="eatouts-login.html"}
  function bindCommon(){document.addEventListener("click",e=>{const a=e.target.closest("[data-action]");if(!a)return;const act=a.dataset.action;if(act==="logout"){logout()}if(act==="back")history.back();if(act==="reset-demo"){EatoutsMgrDB.reset();toast("Demo data reset")}})}
  window.EO={esc,money,toast,currentUser,business,guard,shell,card,metric,table,status,formField,selectField,bindCommon,NAV};
  document.addEventListener("DOMContentLoaded",bindCommon);
})();
