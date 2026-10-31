/* ============================================================
   EATOUTS ORDERS BADGE (T06)
   Fills the standard-header orders counter (#ordCount) from the
   customer store: hidden for browsers, a light-grey number for
   signed-in users, tap -> Orders-List.html.

   Needs <script src="js/eatouts-customer.js"> on the page; without
   it the counter simply stays hidden. No dependency of its own.
   ============================================================ */
(function () {
  'use strict';

  function store() { return window.EatoutsCustomer || null; }

  function paint() {
    var el = document.getElementById('ordCount');
    if (!el) return;
    var S = store();
    var user = (S && S.getUser) ? S.getUser() : null;
    var list = (S && S.summaries && S.summaries.list) ? S.summaries.list() : [];
    el.hidden = !user;
    el.textContent = String(list.length);
    el.setAttribute('aria-label', user ? 'Your orders (' + list.length + ')' : 'Your orders');
  }

  function reload() {
    var S = store();
    if (S && S.reloadLocal) S.reloadLocal();
    paint();
  }

  function onTap(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act="ordersCount"]') : null;
    if (!t) return;
    location.href = 'Orders-List.html';
  }

  function boot() {
    if (!document.getElementById('ordCount')) return;
    paint();
    var S = store();
    if (S && S.onChange) S.onChange(paint);
    window.addEventListener('storage', reload);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) reload(); });
    document.addEventListener('click', onTap);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.EatoutsOrdersBadge = { paint: paint, reload: reload };
})();
