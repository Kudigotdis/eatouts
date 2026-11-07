/* Blog writer/publisher API. */
(function(){
  const seed=[{id:"POST-1",title:"How to choose a great venue",slug:"choose-a-great-venue",status:"published",author:"Demo Author",updated:"2026-10-08",body:"A practical EatOuts guide to choosing a venue."}];
  function posts(){const a=EatoutsDB.collection("blog");if(!a.length){seed.forEach(x=>a.push(x));EatoutsDB.save()}return a}
  window.EatoutsBlog={
    all:()=>posts().slice(),
    create(data){const p=Object.assign({id:"POST-"+Date.now(),status:"draft",updated:new Date().toISOString().slice(0,10)},data);EatoutsDB.upsert("blog",p);return p},
    update(id,data){const p=EatoutsDB.find("blog",id);return p?EatoutsDB.upsert("blog",Object.assign({},p,data)):null},
    publish(id){return this.update(id,{status:"published",published:new Date().toISOString()})},
    unpublish(id){return this.update(id,{status:"draft"})}
  };
})();