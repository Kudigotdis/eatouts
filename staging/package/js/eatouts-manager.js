/* Shared UI/runtime for EatOuts manager/onboarding pages. */
(function(){
  const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const money=n=>`${(EatoutsDB.get().settings||{}).currency||"BWP"} ${Number(n||0).toFixed(2)}`;
  const qs=s=>document.querySelector(s);
  function toast(msg){let x=qs("#eo-toast");if(!x){x=document.createElement("div");x.id="eo-toast";document.body.appendChild(x)}x.textContent=msg;x.classList.add("show");clearTimeout(window.__eoToast);window.__eoToast=setTimeout(()=>x.classList.remove("show"),2200)}
  function currentUser(){return window.EatoutsAuth&&EatoutsAuth.getUser?EatoutsAuth.getUser():null}
  function business(){return window.EatoutsAuth&&EatoutsAuth.getActiveBusiness?EatoutsAuth.getActiveBusiness():null}
  function ensureDemo(){
    if(!EatoutsAuth.isLoggedIn()){localStorage.setItem(EatoutsAuth.SESSION,"u-owner");localStorage.setItem(EatoutsAuth.BUSINESS,"biz-restaurant")}
  }
  function guard(opts={}){
    const u=currentUser();
    if(!u){if(opts.demo!==false){ensureDemo();return currentUser()} location.href="eatouts_login.html";return null}
    if(opts.roles&&opts.roles.length&&!opts.roles.some(r=>EatoutsAuth.hasRole(r))){document.body.innerHTML=`<main class="blocked"><h1>Access restricted</h1><p>Your current account does not have permission for this area.</p><a class="btn primary" href="eatouts_login.html">Sign in</a></main>`;return null}
    return u
  }
  function shell(title,subtitle,content,opts={}){
    const b=business();
    document.title=`${title} · EatOuts`;
    return `<div class="app"><header class="top"><a class="brand" href="${opts.back||"restaurant-dashboard.html"}">EatOuts</a><div class="top-right"><span class="mode">${b?esc(b.name):"Platform"}</span><button class="icon-btn" data-action="logout">Exit</button></div></header><main class="page"><div class="crumb">${esc(opts.section||"Manager")}</div><div class="hero"><div><h1>${esc(title)}</h1><p>${esc(subtitle||"")}</p></div>${opts.action||""}</div>${content}</main><nav class="bottom"><a href="restaurant-dashboard.html">Home</a><a href="order-manager.html">Orders</a><a href="staff-manager.html">Staff</a><a href="analytics-manager.html">Stats</a><a href="eatouts_settings.html">More</a></nav></div>`
  }
  function card(title,body,cls=""){return `<section class="card ${cls}"><div class="card-title">${esc(title)}</div>${body}</section>`}
  function metric(label,value,note=""){return `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`}
  function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
  function status(s){return `<span class="status ${String(s).replace(/\s+/g,"-").toLowerCase()}">${esc(s)}</span>`}
  function formField(name,label,type="text",value="",extra=""){return `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`}
  function selectField(name,label,options,value=""){return `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}">${options.map(o=>`<option value="${esc(o)}" ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select></label>`}
  function bindCommon(){document.addEventListener("click",e=>{const a=e.target.closest("[data-action]");if(!a)return;const act=a.dataset.action;if(act==="logout"){EatoutsAuth.logout();location.href="eatouts_login.html"}if(act==="back")history.back();if(act==="reset-demo"){EatoutsDB.reset();toast("Demo data reset")}})}
  window.EO={esc,money,toast,currentUser,business,guard,shell,card,metric,table,status,formField,selectField,bindCommon};
  document.addEventListener("DOMContentLoaded",bindCommon);
})();