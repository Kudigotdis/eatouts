/* Feedback queue helpers. */
(function(){
  function nextId(){return "FB-"+String(Date.now()).slice(-8)}
  window.EatoutsFeedback={
    all:()=>EatoutsMgrDB.collection("feedback").slice(),
    create(data){const f=Object.assign({id:nextId(),status:"open",created:new Date().toISOString(),assignedTo:""},data);EatoutsMgrDB.upsert("feedback",f);return f},
    update(id,data){const f=EatoutsMgrDB.find("feedback",id);return f?EatoutsMgrDB.upsert("feedback",Object.assign({},f,data)):null},
    mine(userId){return this.all().filter(x=>x.userId===userId)}
  };
})();