/* Feedback queue helpers. */
(function(){
  function nextId(){return "FB-"+String(Date.now()).slice(-8)}
  window.EatoutsFeedback={
    all:()=>EatoutsDB.collection("feedback").slice(),
    create(data){const f=Object.assign({id:nextId(),status:"open",created:new Date().toISOString(),assignedTo:""},data);EatoutsDB.upsert("feedback",f);return f},
    update(id,data){const f=EatoutsDB.find("feedback",id);return f?EatoutsDB.upsert("feedback",Object.assign({},f,data)):null},
    mine(userId){return this.all().filter(x=>x.userId===userId)}
  };
})();