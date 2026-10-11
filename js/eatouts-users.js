/* User CRUD helpers over EatoutsMgrDB.users[]. */
(function(){
  function users(){return EatoutsMgrDB.collection("users")}
  window.EatoutsUsers={
    all:()=>users().slice(),
    find:id=>EatoutsMgrDB.find("users",id),
    byWhatsapp:n=>users().find(u=>String(u.whatsapp).replace(/\D/g,"")===String(n).replace(/\D/g,""))||null,
    create(data){const u=Object.assign({id:"u-"+Date.now(),status:"active",roles:[]},data);EatoutsMgrDB.upsert("users",u);return u},
    update(id,data){const u=EatoutsMgrDB.find("users",id);if(!u)return null;return EatoutsMgrDB.upsert("users",Object.assign({},u,data))},
    remove(id){EatoutsMgrDB.remove("users",id)},
    setStatus(id,status){return this.update(id,{status})}
  };
})();