/* EatOuts authentication. WhatsApp is the primary credential/identifier. */
(function(){
  const SESSION="eatouts_active_session_v2", BUSINESS="eatouts_active_business_v2";
  const demoCredentials={
    customer:{whatsapp:"26770000001",pin:"1234"},
    restaurant:{whatsapp:"26770000002",pin:"1234"},
    bottle_store:{whatsapp:"26770000003",pin:"1234"},
    caterer:{whatsapp:"26770000004",pin:"1234"},
    lodge:{whatsapp:"26770000005",pin:"1234"},
    supplier:{whatsapp:"26770000006",pin:"1234"},
    platform_admin:{whatsapp:"26770000099",pin:"1234"}
  };
  function norm(v){return String(v||"").replace(/\D/g,"")}
  function getUser(){try{const id=localStorage.getItem(SESSION);return id?EatoutsUsers.find(id):null}catch(e){return null}}
  function roles(){const u=getUser();return u?EatoutsRoles.roles(u):[]}
  function hasRole(r){return roles().includes(r)}
  function can(p){const u=getUser();return !!u&&EatoutsRoles.can(u,p)}
  function setActiveBusiness(id){if(id)localStorage.setItem(BUSINESS,id);else localStorage.removeItem(BUSINESS);return id}
  function getActiveBusiness(){const u=getUser();const id=localStorage.getItem(BUSINESS)||u&&u.businessId;return id?EatoutsDB.find("businesses",id):null}
  function login(whatsapp,pin){
    const u=EatoutsUsers.byWhatsapp(norm(whatsapp));
    if(!u)return Promise.resolve({ok:false,message:"No EatOuts account matches that WhatsApp number."});
    if(u.status!=="active")return Promise.resolve({ok:false,message:"This account is not active."});
    if(String(pin||"")!=="1234")return Promise.resolve({ok:false,message:"Incorrect PIN. Demo PIN: 1234."});
    localStorage.setItem(SESSION,u.id);if(u.businessId)setActiveBusiness(u.businessId);
    return Promise.resolve({ok:true,user:u,route:routeFor(u)});
  }
  function loginDemo(type){const d=demoCredentials[type]||demoCredentials.restaurant;return login(d.whatsapp,d.pin)}
  function logout(){localStorage.removeItem(SESSION);localStorage.removeItem(BUSINESS)}
  function routeFor(u){
    if(!u)return "eatouts_login.html";
    if((u.roles||[]).some(r=>r.startsWith("platform_"))||u.type==="platform_admin")return "eatouts_admin_dashboard.html";
    if(u.type==="customer")return "eatouts_profile.html";
    if(u.type==="supplier")return "quote-manager.html";
    const b=EatoutsDB.find("businesses",u.businessId);
    if(b&&b.type==="lodge")return "room-manager.html";
    return "restaurant-dashboard.html";
  }
  window.EatoutsAuth={SESSION,BUSINESS,demoCredentials,getUser,roles,hasRole,can,setActiveBusiness,getActiveBusiness,login,loginDemo,logout,routeFor,isLoggedIn:()=>!!getUser()};
})();