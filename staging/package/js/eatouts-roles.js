/* EatOuts role/permission matrix. */
(function(){
  const MATRIX={
    platform_admin:["*"],
    platform_ops:["admin_dashboard","users_manager","feedback","verification","disputes","platform_analytics","notifications","settings"],
    platform_support:["feedback","users_manager"],
    platform_author:["blog"],
    platform_author_editor:["blog"],
    platform_analyst:["platform_analytics"],
    biz_owner:["business:*","staff","delivery","orders","reservations","rooms","reviews","billing","analytics","quotes","bookings"],
    biz_admin:["business:*","staff","delivery","orders","reservations","rooms","reviews","analytics"],
    biz_manager:["orders","staff"],
    staff:["orders"],
    customer:["customer:*"],
    supplier:["quotes","bookings","business:supplier"],
    lodge_owner:["business:lodge","rooms","bookings","orders","reviews","billing","analytics"]
  };
  function roles(user){return (user&&Array.isArray(user.roles)?user.roles:[user&&user.type].filter(Boolean));}
  function can(user,perm){
    return roles(user).some(r=>MATRIX[r]&& (MATRIX[r].includes("*")||MATRIX[r].includes(perm)||MATRIX[r].includes("business:*")||MATRIX[r].includes("customer:*")||MATRIX[r].includes("business:"+perm)));
  }
  window.EatoutsRoles={MATRIX,roles,can,describe(r){return (r||"").replace(/_/g," ");}};
})();