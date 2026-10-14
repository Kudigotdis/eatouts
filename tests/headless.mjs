#!/usr/bin/env node
/*
 * tests/headless.mjs — safe, dependency-free headless-Chrome driver.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SAFETY CONTRACT (read before editing):
 *   1. NEVER run `Get-Process chrome | Stop-Process`, `Stop-Process -Name chrome`,
 *      `taskkill /IM chrome.exe`, or any blanket kill of Chrome processes.
 *      That terminates the *user's* real browser windows.
 *   2. This helper only ever launches its own Chrome with a UNIQUE
 *      --user-data-dir (eo-*) and a RANDOM free debugging port, so there is
 *      never a port conflict that would tempt anyone to purge Chrome.
 *   3. Teardown (close()) targets ONLY the process tree this helper spawned,
 *      via `taskkill /PID <pid> /T /F` (Windows) or the child's process group
 *      (Unix), after asking the browser to close itself over CDP.
 *   4. Keep it that way. If a stale instance blocks a port, kill only the tree
 *      whose command line contains this helper's `eo-` profile marker — never
 *      all of chrome.exe.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Usage (library):
 *   import { launch } from './tests/headless.mjs';
 *   const h = await launch({ url: 'http://127.0.0.1:5199/index.html' });
 *   await h.waitFor('typeof window.EatoutsBridge === "object"');
 *   const out = await h.evaluate('document.title');
 *   h.events.forEach(e => console.error(e));
 *   await h.close();
 *
 * Usage (CLI):
 *   node tests/headless.mjs --url=http://127.0.0.1:5199/index.html \
 *     --ready="typeof window.EatoutsBridge" --expr-file=./probe.js
 *
 * Flags: --url=  --ready=expr  --expr=expr  --expr-file=path
 *        --width=N --height=N --timeout=ms  --port=N --chrome-path=path
 */

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome(explicit) {
  const candidates = [
    explicit,
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
      : null,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('Chrome not found. Pass --chrome-path= / set CHROME_PATH.');
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function getJson(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      lastErr = e;
    }
    await sleep(250);
  }
  throw new Error('devtools not ready at ' + url + (lastErr ? ' (' + lastErr.message + ')' : ''));
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (ev) => {
      let raw = ev && ev.data !== undefined ? ev.data : ev;
      if (typeof raw !== 'string') {
        try { raw = Buffer.from(raw).toString('utf8'); } catch { raw = String(raw); }
      }
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }

  static open(wsUrl) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.addEventListener('open', () => resolve(new CDP(ws)), { once: true });
      ws.addEventListener('error', () => reject(new Error('CDP socket failed: ' + wsUrl)), { once: true });
    });
  }

  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  close() {
    try { this.ws.close(); } catch { /* ignore */ }
  }
}

class Headless {
  constructor({ chromePath, port, profileDir, proc, browser, pageCdp }) {
    this.chromePath = chromePath;
    this.port = port;
    this.profileDir = profileDir;
    this.pid = proc.pid;
    this.events = [];
    this._proc = proc;
    this._browser = browser;
    this._page = pageCdp;
    this._closed = false;
  }

  async evaluate(expression) {
    const r = await this._page.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (r.exceptionDetails) {
      const ex = r.exceptionDetails.exception;
      throw new Error('eval threw: ' + (ex && ex.description ? ex.description : r.exceptionDetails.text));
    }
    return r.result ? r.result.value : undefined;
  }

  async waitFor(expression, { timeoutMs = 15000, intervalMs = 300 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
      try {
        last = await this.evaluate(expression);
        if (last) return last;
      } catch (e) {
        last = 'ERR: ' + e.message;
      }
      await sleep(intervalMs);
    }
    throw new Error('waitFor timed out: ' + expression + ' (last=' + last + ')');
  }

  async close() {
    if (this._closed) return;
    this._closed = true;

    try { await Promise.race([this._browser.send('Browser.close'), sleep(2000)]); } catch { /* ignore */ }
    this._browser.close();
    this._page.close();

    const exited = new Promise((resolve) => {
      if (this._proc.exitCode !== null) return resolve();
      this._proc.once('exit', resolve);
      setTimeout(resolve, 4000);
    });
    if (this._proc.exitCode === null && !this._proc.killed) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(this.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        try { process.kill(-this.pid, 'SIGKILL'); } catch { try { this._proc.kill('SIGKILL'); } catch { /* ignore */ } }
      }
    }
    await exited;

    for (let i = 0; i < 10; i++) {
      try { rmSync(this.profileDir, { recursive: true, force: true }); break; }
      catch { await sleep(200); }
    }
  }
}

export async function launch(opts = {}) {
  const url = opts.url || 'about:blank';
  const chromePath = findChrome(opts.chromePath);
  const port = opts.port || (await freePort());
  const timeoutMs = opts.timeoutMs || 15000;

  const base = path.join(tmpdir(), 'opencode', 'eo-headless');
  mkdirSync(base, { recursive: true });
  const profileDir = mkdtempSync(path.join(base, 'eo-'));

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + profileDir,
    '--window-size=' + (opts.width || 460) + ',' + (opts.height || 900),
  ];
  if (Array.isArray(opts.chromeFlags)) args.push(...opts.chromeFlags);
  args.push(url);

  const proc = spawn(chromePath, args, {
    stdio: 'ignore',
    detached: process.platform !== 'win32',
  });

  const version = await getJson('http://127.0.0.1:' + port + '/json/version', timeoutMs).catch(async (e) => {
    try { await new Headless({ chromePath, port, profileDir, proc, browser: { send() {}, close() {} }, pageCdp: { close() {} } }).close(); } catch { /* ignore */ }
    throw e;
  });
  const browser = await CDP.open(version.webSocketDebuggerUrl);

  const targets = await getJson('http://127.0.0.1:' + port + '/json/list', timeoutMs);
  const pages = targets.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  const pageInfo = pages.find((t) => t.url && t.url === url) || pages[0];
  if (!pageInfo) throw new Error('no page target found on ' + port);
  const pageCdp = await CDP.open(pageInfo.webSocketDebuggerUrl);
  await pageCdp.send('Runtime.enable');

  const headless = new Headless({ chromePath, port, profileDir, proc, browser, pageCdp });
  pageCdp.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails || {};
      headless.events.push('EXCEPTION: ' + (d.text || (d.exception && d.exception.description) || ''));
    } else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      const msg = (m.params.args || [])
        .map((a) => (a.value !== undefined ? a.value : a.description || ''))
        .join(' ');
      headless.events.push('CONSOLE.' + m.params.type + ': ' + msg);
    }
  });

  return headless;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] === undefined ? true : m[2];
    else out._.push(a);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const a = parseArgs(process.argv.slice(2));
  const url = a.url || a._[0];
  if (!url) {
    console.error('usage: node tests/headless.mjs --url=<url> [--ready=expr] [--expr=expr | --expr-file=file] [--width=N --height=N --timeout=ms]');
    process.exit(2);
  }
  (async () => {
    const h = await launch({
      url,
      width: a.width ? Number(a.width) : undefined,
      height: a.height ? Number(a.height) : undefined,
      timeoutMs: a.timeout ? Number(a.timeout) : undefined,
      port: a.port ? Number(a.port) : undefined,
      chromePath: typeof a['chrome-path'] === 'string' ? a['chrome-path'] : undefined,
    });
    try {
      if (a.ready) await h.waitFor(a.ready, { timeoutMs: a.timeout ? Number(a.timeout) : 15000 });
      let expr = typeof a.expr === 'string' ? a.expr : undefined;
      if (typeof a['expr-file'] === 'string') expr = readFileSync(a['expr-file'], 'utf8');
      if (expr) console.log(JSON.stringify(await h.evaluate(expr), null, 2));
      if (h.events.length) {
        console.error('EVENTS(' + h.events.length + ')');
        for (const e of h.events) console.error('  ' + e);
      }
    } finally {
      await h.close();
    }
  })().catch((e) => {
    console.error('FATAL: ' + e.message);
    process.exit(1);
  });
}
