/* Back History for the standalone pages (T08b) - the other half of the T08
   popup. index.html records its own screens from render(); every page that
   loads this file records itself into the same sessionStorage key and opens
   the same "Recent pages" dialog from its .brand-mark button.

   One key, two entry shapes on purpose:
     SPA        {key,label,snap,t} - replayed by restoreHistory() in index.html
     standalone {href,label,t}     - replayed by a plain navigation
   The SPA has no hash router, so a snapshot entry opened from a standalone
   page goes to index.html#<tab> instead of restoring a deep screen. */
(function(){
  "use strict";
  if(window.EatoutsBackHistory)return;
  var KEY="eatouts.history.v1", MAX=5;

  function read(){
    try{var a=JSON.parse(window.sessionStorage.getItem(KEY)||"[]");return Array.isArray(a)?a:[];}
    catch(e){return[];}
  }
  function write(list){
    try{window.sessionStorage.setItem(KEY,JSON.stringify(list.slice(0,MAX)));}catch(e){}
  }
  function esc(s){
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function here(){return (location.pathname.split("/").pop()||"index.html")+(location.hash||"");}
  function label(){
    var t=String(document.title||"").split(/\u2014|\u00b7|\s\|\s/)[0].trim();
    return t||(location.pathname.split("/").pop()||"EatOuts");
  }
  function ago(t){
    var d=Math.max(0,Date.now()-(Number(t)||0));
    if(d<60000)return "now";
    if(d<3600000)return Math.floor(d/60000)+"m";
    if(d<86400000)return Math.floor(d/3600000)+"h";
    return Math.floor(d/86400000)+"d";
  }
  /* Record this page on load (so the page you are on is listed) and again on
     pagehide (which refreshes the timestamp). Revisits move to the top. */
  function record(){
    var href=here(), list=read().filter(function(e){return e.href!==href;});
    list.unshift({href:href,label:label(),t:Date.now()});
    write(list);
  }
  /* Where a tap on an entry goes. Exposed so the suite can assert it. */
  function target(entry){
    if(!entry)return "";
    if(entry.href)return entry.href;
    return "index.html#"+((entry.snap&&entry.snap.tab)||"promos");
  }
  function css(){
    if(document.getElementById("eo-hist-css"))return;
    var st=document.createElement("style");
    st.id="eo-hist-css";
    st.textContent=[
      '.hist-wrap{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px}',
      '.hist-scrim{position:absolute;inset:0;background:rgba(20,18,12,.28);-webkit-backdrop-filter:blur(10px) saturate(1.2);backdrop-filter:blur(10px) saturate(1.2)}',
      '.hist-pop{position:relative;width:100%;max-width:360px;max-height:min(70vh,420px);overflow:auto;overscroll-behavior:contain;background:#fff;border:1px solid #ece7db;border-radius:14px;box-shadow:0 24px 60px rgba(16,24,40,.18)}',
      '.hist-pop h3{margin:0;padding:14px 16px 10px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#a89a7e}',
      '.hist-row{display:flex;align-items:center;gap:10px;width:100%;padding:13px 16px;border:0;border-bottom:1px solid #f4efe4;background:#fff;text-align:left;font:inherit;cursor:pointer}',
      '.hist-row:last-child{border-bottom:0}',
      '.hist-row:active{background:#faf8f2}',
      '.hist-row .lab{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:700;color:#1a1a1a}',
      '.hist-row .ago{flex:0 0 auto;font-size:11px;font-weight:800;color:#a89a7e}',
      '.hist-empty{padding:18px 16px;font-size:12.5px;color:#a89a7e;text-align:center}',
      /* the logo becomes a button on these pages - keep the anchor look */
      '.brand-mark[data-act="backHistory"]{border:0;background:none;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer}'
    ].join("\n");
    document.head.appendChild(st);
  }
  function close(){
    var el=document.getElementById("hist-pop");
    if(el)el.remove();
  }
  function open(){
    css();
    var el=document.getElementById("hist-pop");
    if(!el){el=document.createElement("div");el.id="hist-pop";document.body.appendChild(el);}
    var list=read().slice(0,MAX);
    var h='<div class="hist-wrap"><div class="hist-scrim" data-act="closeBackHistory"></div>'+
      '<div class="hist-pop" role="dialog" aria-label="Back History"><h3>Recent pages</h3>';
    if(!list.length)h+='<div class="hist-empty">No recent pages yet.</div>';
    list.forEach(function(e,i){
      h+='<button class="hist-row" type="button" data-act="gotoHistory" data-i="'+i+'">'+
        '<span class="lab">'+esc(e.label||"EatOuts")+'</span>'+
        '<span class="ago">'+ago(e.t)+'</span></button>';
    });
    h+='</div></div>';
    el.innerHTML=h;
  }
  function go(entry){
    var url=target(entry);
    if(!url)return;
    close();
    window.location.href=url;
  }

  document.addEventListener("click",function(e){
    var t=e.target&&e.target.closest?e.target.closest("[data-act]"):null;
    if(!t)return;
    var act=t.getAttribute("data-act");
    if(act==="backHistory"){e.preventDefault();open();}
    else if(act==="closeBackHistory"){e.preventDefault();close();}
    else if(act==="gotoHistory"){e.preventDefault();go(read()[Number(t.getAttribute("data-i"))]);}
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});
  window.addEventListener("pagehide",record);

  function boot(){css();record();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();

  window.EatoutsBackHistory={open:open,close:close,record:record,read:read,target:target};
})();
