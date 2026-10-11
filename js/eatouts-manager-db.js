/* EatoutsMgrDB — namespaced local/offline store for the manager/admin/auth
   pages. Deliberately separate from the customer app's EatoutsDB
   (js/eatouts-db.js, key "eatouts_db_v2") so the two data models never clash. */
(function(){
  const KEY="eatouts_manager_v1";
  const seed={
    users:[
      {id:"u-admin",firstName:"Demo",surname:"Admin",whatsapp:"26770000099",type:"platform_admin",status:"active",roles:["platform_admin"]},
      {id:"u-owner",firstName:"Demo",surname:"Owner",whatsapp:"26770000002",type:"biz_owner",status:"active",roles:["biz_owner"],businessId:"biz-restaurant"},
      {id:"u-customer",firstName:"Demo",surname:"Customer",whatsapp:"26770000001",type:"customer",status:"active",roles:["customer"]},
      {id:"u-bottle",firstName:"Demo",surname:"Bottle",whatsapp:"26770000003",type:"biz_owner",status:"active",roles:["biz_owner"],businessId:"biz-bottle"},
      {id:"u-caterer",firstName:"Demo",surname:"Caterer",whatsapp:"26770000004",type:"biz_owner",status:"active",roles:["biz_owner"],businessId:"biz-caterer"},
      {id:"u-lodge",firstName:"Demo",surname:"Lodge",whatsapp:"26770000005",type:"biz_owner",status:"active",roles:["biz_owner"],businessId:"biz-lodge"},
      {id:"u-supplier",firstName:"Demo",surname:"Supplier",whatsapp:"26770000006",type:"supplier",status:"active",roles:["supplier"],businessId:"biz-supplier"}
    ],
    businesses:[
      {id:"biz-restaurant",name:"The Yellow Giraffe Coffee Club",type:"restaurant",status:"verified",town:"Gaborone",area:"CBD",ownerId:"u-owner",subscription:"Growth"},
      {id:"biz-bottle",name:"Demo Bottle Store",type:"bottle_store",status:"pending",town:"Gaborone",area:"Broadhurst",ownerId:"u-bottle",subscription:"Starter"},
      {id:"biz-caterer",name:"Demo Caterers",type:"caterer",status:"verified",town:"Gaborone",area:"Block 8",ownerId:"u-caterer",subscription:"Growth"},
      {id:"biz-lodge",name:"Demo Lodge",type:"lodge",status:"verified",town:"Francistown",area:"CBD",ownerId:"u-lodge",subscription:"Growth"},
      {id:"biz-supplier",name:"Demo Event Supplies",type:"supplier",status:"verified",town:"Gaborone",area:"Tlokweng",ownerId:"u-supplier",subscription:"Starter"}
    ],
    staff:[
      {id:"st-1",businessId:"biz-restaurant",firstName:"Amogelang",surname:"Molefe",dob:"1998-04-12",gender:"Female",roles:["cashier","server"],responsibilities:["Cash-up","Table service"],salaryAmount:850,salaryPeriod:"week",contact:"26771111222",emergencyContact:"26772222333",startDate:"2025-06-01",status:"active"},
      {id:"st-2",businessId:"biz-restaurant",firstName:"Kabelo",surname:"Motsamai",dob:"1995-09-20",gender:"Male",roles:["manager"],responsibilities:["Opening","Staff supervision"],salaryAmount:4200,salaryPeriod:"month",contact:"26773333444",emergencyContact:"26774444555",startDate:"2024-03-01",status:"active"}
    ],
    orders:[
      {id:"EO-1001",businessId:"biz-restaurant",customer:"Thato M.",items:["Chicken platter","2x Coke"],total:180,status:"new",created:"2026-10-11 01:20",delivery:"Pickup"},
      {id:"EO-1002",businessId:"biz-restaurant",customer:"Neo K.",items:["Burger","Fries"],total:95,status:"accepted",created:"2026-10-11 01:10",delivery:"Delivery"},
      {id:"EO-1003",businessId:"biz-restaurant",customer:"Oarabile T.",items:["Coffee","Cake"],total:65,status:"preparing",created:"2026-10-11 00:58",delivery:"Pickup"},
      {id:"EO-1004",businessId:"biz-restaurant",customer:"Boitumelo R.",items:["2x Pizza"],total:240,status:"ready",created:"2026-10-11 00:40",delivery:"Delivery"}
    ],
    reservations:[
      {id:"RS-001",businessId:"biz-restaurant",guest:"Kago & 3",date:"2026-10-11",time:"19:00",guests:4,deposit:200,status:"confirmed"},
      {id:"RS-002",businessId:"biz-restaurant",guest:"Mpho",date:"2026-10-12",time:"18:30",guests:2,deposit:0,status:"pending"}
    ],
    rooms:[
      {id:"RM-01",businessId:"biz-lodge",name:"Room 1",type:"Standard",rate:650,status:"available",housekeeping:"clean"},
      {id:"RM-02",businessId:"biz-lodge",name:"Room 2",type:"Deluxe",rate:900,status:"occupied",housekeeping:"needs_service"},
      {id:"RM-03",businessId:"biz-lodge",name:"Room 3",type:"Family",rate:1200,status:"maintenance",housekeeping:"maintenance"}
    ],
    reviews:[
      {id:"RV-1",businessId:"biz-restaurant",customer:"Lebo",stars:5,text:"Great service and coffee.",date:"2026-10-10",reply:"Thank you!"},
      {id:"RV-2",businessId:"biz-restaurant",customer:"Tumisang",stars:4,text:"Food was good; delivery was late.",date:"2026-10-09",reply:"We are improving delivery."}
    ],
    feedback:[],
    quotes:[],
    bookings:[],
    notifications:[],
    favourites:[],
    addresses:[],
    invoices:[
      {id:"INV-100",businessId:"biz-restaurant",date:"2026-10-01",amount:450,status:"paid"},
      {id:"INV-099",businessId:"biz-restaurant",date:"2026-09-01",amount:450,status:"paid"}
    ],
    verification:[
      {id:"VER-01",businessId:"biz-bottle",submitted:"2026-10-09",documents:["ID","Trading licence"],callback:"Not yet called",status:"pending"}
    ],
    disputes:[
      {id:"DSP-01",orderId:"EO-0990",businessId:"biz-restaurant",customer:"Kea",reason:"Missing item",status:"open",amount:45}
    ],
    settings:{currency:"BWP",setupFee:450,defaultDeliveryFee:35,zones:["Gaborone CBD","Broadhurst","Block 8"],featureFlags:{reviews:true,delivery:true,quotes:true}}
  };
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function load(){
    try{const raw=localStorage.getItem(KEY);if(raw)return Object.assign(clone(seed),JSON.parse(raw));}catch(e){}
    return clone(seed);
  }
  let state=load();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));document.dispatchEvent(new CustomEvent("eatouts:db-saved"));}catch(e){}}
  function ensure(k){if(!Array.isArray(state[k]))state[k]=[];return state[k];}
  window.EatoutsMgrDB={
    KEY,
    get(){return state},
    save,
    reset(){state=clone(seed);save();document.dispatchEvent(new CustomEvent("eatouts:db-reset"));},
    collection(k){return ensure(k)},
    find(k,id){return ensure(k).find(x=>String(x.id)===String(id))||null},
    filter(k,fn){return ensure(k).filter(fn)},
    upsert(k,obj){const a=ensure(k);const i=a.findIndex(x=>String(x.id)===String(obj.id));if(i<0)a.push(obj);else a[i]=Object.assign({},a[i],obj);save();return obj},
    remove(k,id){const a=ensure(k);const i=a.findIndex(x=>String(x.id)===String(id));if(i>=0)a.splice(i,1);save()},
    resolveContent(id){return this.find("businesses",id)||null}
  };
})();