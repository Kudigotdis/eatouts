/* ============================================================
   GET /admin/login   (Milestone B)

   The one page a non-Botswana visitor may load, because without it the
   operator cannot ever obtain the bypass cookie that unlocks everything else.
   functions/_middleware.js skips /admin/ entirely; the real authority is
   POST /api/admin/login (password) plus adminGate() on every other route.

   The page carries no data and no configuration: it posts credentials to
   /api/admin/login and then follows the route that endpoint returns. When the
   admin secrets are absent it answers 503 with a message that names nothing.
   ============================================================ */
import { adminConfigured } from '../api/_security.js';

function page(notice) {
  return '<!doctype html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<meta name="robots" content="noindex,nofollow">\n' +
    '<title>EatOuts operator access</title>\n' +
    '<style>\n' +
    '*{box-sizing:border-box}\n' +
    'html,body{margin:0;height:100%}\n' +
    'body{display:flex;align-items:center;justify-content:center;\n' +
    '  background:#faf7f0;color:#232019;\n' +
    '  font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}\n' +
    '.card{width:100%;max-width:360px;margin:24px;padding:28px 24px 24px;\n' +
    '  background:#fff;border:1px solid #ece7db;border-radius:16px;\n' +
    '  box-shadow:0 18px 48px rgba(35,32,25,.08)}\n' +
    'h1{margin:0 0 6px;font-size:20px;letter-spacing:-.01em}\n' +
    'h1 em{font-style:normal;color:#c84513}\n' +
    '.sub{margin:0 0 20px;font-size:13px;color:#8a7d64}\n' +
    'label{display:block;margin:0 0 14px;font-size:12px;font-weight:600;\n' +
    '  color:#8a7d64;text-transform:uppercase;letter-spacing:.06em}\n' +
    'input{display:block;width:100%;margin-top:6px;padding:12px 14px;font-size:15px;\n' +
    '  color:#232019;background:#faf7f0;border:1px solid #ece7db;border-radius:10px}\n' +
    'input:focus{outline:2px solid #c84513;outline-offset:1px;background:#fff}\n' +
    'button{width:100%;margin-top:6px;padding:13px;font-size:15px;font-weight:600;\n' +
    '  color:#fff;background:#c84513;border:0;border-radius:10px;cursor:pointer}\n' +
    'button[disabled]{opacity:.6;cursor:default}\n' +
    '.msg{min-height:20px;margin:14px 0 0;font-size:13px;color:#8a7d64}\n' +
    '.msg.bad{color:#b3261e}\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<main class="card">\n' +
    '  <h1>Operator <em>access</em>.</h1>\n' +
    '  <p class="sub">Sign in to use the EatOuts admin console from outside Botswana.</p>\n' +
    '  <form id="f" method="post" action="/api/admin/login">\n' +
    '    <label>Username<input id="u" name="username" autocomplete="username" autocapitalize="none" required></label>\n' +
    '    <label>Password<input id="p" name="password" type="password" autocomplete="current-password" required></label>\n' +
    '    <button id="b" type="submit">Sign in</button>\n' +
    '  </form>\n' +
    '  <p class="msg' + (notice ? ' bad' : '') + '" id="m" role="status" aria-live="polite">' +
    (notice || '') + '</p>\n' +
    '</main>\n' +
    '<script>\n' +
    '(function(){\n' +
    '  var f=document.getElementById("f"),m=document.getElementById("m"),b=document.getElementById("b");\n' +
    '  function say(t,bad){m.textContent=t||"";m.className="msg"+(bad?" bad":"");}\n' +
    '  f.addEventListener("submit",function(ev){\n' +
    '    ev.preventDefault();\n' +
    '    b.disabled=true;say("Signing in\\u2026",false);\n' +
    '    fetch("/api/admin/login",{\n' +
    '      method:"POST",headers:{"content-type":"application/json"},\n' +
    '      body:JSON.stringify({username:document.getElementById("u").value,password:document.getElementById("p").value})\n' +
    '    }).then(function(r){\n' +
    '      return r.json().catch(function(){return {};}).then(function(j){return {ok:r.ok,status:r.status,j:j};});\n' +
    '    }).then(function(res){\n' +
    '      if(res.ok&&res.j&&res.j.ok){location.replace(res.j.route||"eatouts-admin-dashboard.html");return;}\n' +
    '      b.disabled=false;\n' +
    '      if(res.status===429){say("Too many attempts. Wait a few minutes.",true);return;}\n' +
    '      if(res.status===503){say("Access is not available right now.",true);return;}\n' +
    '      say("That username or password did not work.",true);\n' +
    '    }).catch(function(){b.disabled=false;say("Network error - try again.",true);});\n' +
    '  });\n' +
    '})();\n' +
    '</script>\n' +
    '</body>\n' +
    '</html>\n';
}

function html(body, status) {
  return new Response(body, {
    status: status || 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function onRequestGet(context) {
  var configured = adminConfigured(context && context.env);
  return html(page(configured ? '' : 'Access is not configured yet.'), configured ? 200 : 503);
}

export function onRequest(context) {
  if (context.request.method === 'GET' || context.request.method === 'HEAD') {
    return onRequestGet(context);
  }
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD', 'cache-control': 'no-store' }
  });
}
