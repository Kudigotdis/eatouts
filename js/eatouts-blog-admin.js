/* Blog writer/publisher helpers for the manager/admin pages.
   Namespaced (EatoutsBlogAdmin) so it never collides with the customer
   blog engine in js/eatouts-blog.js (window.EatoutsBlog). */
(function(){
  const seed=[{id:"POST-1",title:"How to choose a great venue",slug:"choose-a-great-venue",status:"published",author:"Demo Author",updated:"2026-10-08",body:"A practical EatOuts guide to choosing a venue."}];
  function posts(){const a=EatoutsMgrDB.collection("blog");if(!a.length){seed.forEach(x=>a.push(x));EatoutsMgrDB.save()}return a}
  window.EatoutsBlogAdmin={
    all:()=>posts().slice(),
    create(data){const p=Object.assign({id:"POST-"+Date.now(),status:"draft",updated:new Date().toISOString().slice(0,10)},data);EatoutsMgrDB.upsert("blog",p);return p},
    update(id,data){const p=EatoutsMgrDB.find("blog",id);return p?EatoutsMgrDB.upsert("blog",Object.assign({},p,data)):null},
    publish(id){return this.update(id,{status:"published",published:new Date().toISOString()})},
    unpublish(id){return this.update(id,{status:"draft"})}
  };
})();
