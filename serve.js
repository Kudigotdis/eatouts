/* ============================================================
   Minimal static file server - Node fallback for run-eatouts.bat
   Only used when python is not on PATH.

   Serves this folder on the given port and exits cleanly on
   Ctrl+C / window close so the launcher window stays truthful
   about when the server is running.
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const PORT = parseInt(process.argv[2], 10) || 5173;
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(function (req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname || '/');
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  /* the app is the portrait phone UI - no wrapper, no sidebar */
  if (pathname === '/') pathname = '/index.html';

  /* resolve inside ROOT only - no traversal out of the folder */
  const target = path.join(ROOT, pathname);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(target, function (err, stat) {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found: ' + pathname);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, HOST, function () {
  console.log('EatOuts: serving ' + ROOT + ' on http://' + HOST + ':' + PORT + '/');
});

server.on('error', function (e) {
  console.error('EatOuts server error: ' + e.message);
  process.exit(1);
});

/* closing the launcher window must stop the server too */
process.on('SIGINT', function () { process.exit(0); });
process.on('SIGTERM', function () { process.exit(0); });