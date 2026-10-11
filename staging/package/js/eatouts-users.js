/* User CRUD helpers over EatoutsDB.users[]. */
(function(){
  function users(){return EatoutsDB.collection("users")}
  window.EatoutsUsers={
    all:()=>users().slice(),
    find:id=>EatoutsDB.find("users",id),
    byWhatsapp:n=>users().find(u=>String(u.whatsapp).replace(/\D/g,"")===String(n).replace(/\D/g,""))||null,
    create(data){const u=Object.assign({id:"u-"+Date.now(),status:"active",roles:[]},data);EatoutsDB.upsert("users",u);return u},
    update(id,data){const u=EatoutsDB.find("users",id);if(!u)return null;return EatoutsDB.upsert("users",Object.assign({},u,data))},
    remove(id){EatoutsDB.remove("users",id)},
    setStatus(id,status){return this.update(id,{status})}
  };
})();