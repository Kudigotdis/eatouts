#!/usr/bin/env node
/* ============================================================
   scripts/hash-admin-password.mjs

   Produces the value for the ADMIN_PASSWORD_PBKDF2 secret:

       <iterations>:<saltHex>:<hashHex>          e.g. 600000:9f3c...:5a1d...

   Usage (PowerShell):
     node scripts/hash-admin-password.mjs 'my long admin passphrase'
     $env:ADMIN_PASSWORD='my long admin passphrase'; node scripts/hash-admin-password.mjs
     'my long admin passphrase' | node scripts/hash-admin-password.mjs
     npx wrangler pages secret put ADMIN_PASSWORD_PBKDF2   # paste the printed line

   Only the derived line goes to stdout, so `| Set-Clipboard` /
   `| npx wrangler pages secret put ...` never captures the plaintext password.
   Hint + cost notes go to stderr.

   WHY 600k: the browser never submits this password to be stored anywhere, but
   it is the one credential that opens the geo-gate, so it gets the OWASP 2023
   PBKDF2-SHA256 work factor (600,000) instead of the 100,000 the customer login
   in functions/api/_auth.js uses for compatibility with existing rows.

   The same value is verifiable from the Workers runtime because
   functions/api/_security.js feeds the salt hex and the iteration count straight
   into functions/api/_auth.js `hashPassword` (PBKDF2-SHA256, 256-bit output).
   ============================================================ */
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

var ITER = 600000;
var KEYLEN = 32;
var SALT_BYTES = 16;

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

function readStdin() {
  return new Promise(function (resolve, reject) {
    if (process.stdin.isTTY) return resolve('');
    var chunks = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (c) { chunks += c; });
    process.stdin.on('end', function () { resolve(chunks); });
    process.stdin.on('error', reject);
  });
}

/** Prompt with echo suppressed, so the password never appears in the terminal. */
function promptHidden(question) {
  return new Promise(function (resolve) {
    var rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    var muted = false;
    rl._writeToOutput = function (s) { if (!muted) rl.output.write(s); };
    rl.question(question, function (answer) {
      rl.output.write('\n');
      rl.close();
      resolve(answer);
    });
    muted = true;
    rl.output.write(question);
  });
}

async function main() {
  var password = process.argv[2] || process.env.ADMIN_PASSWORD || '';

  if (!password) {
    password = (await readStdin()).replace(/[\r\n]+$/, '');
  }
  if (!password) {
    if (!process.stdin.isTTY) die('No password supplied (argv, ADMIN_PASSWORD or stdin).');
    password = await promptHidden('Admin password: ');
  }
  if (String(password).length < 12) {
    die('Refusing: use at least 12 characters for the admin passphrase.');
  }

  var saltHex = randomBytes(SALT_BYTES).toString('hex');
  var hashHex = pbkdf2Sync(String(password), Buffer.from(saltHex, 'hex'), ITER, KEYLEN, 'sha256').toString('hex');

  process.stderr.write('PBKDF2-SHA256 ' + ITER + ' iterations, ' + SALT_BYTES + '-byte salt, 32-byte key.\n');
  process.stderr.write('Store as the ADMIN_PASSWORD_PBKDF2 secret: pasting the single line below.\n');
  process.stderr.write('Never commit it, and never reuse the password anywhere else.\n');
  process.stdout.write(ITER + ':' + saltHex + ':' + hashHex + '\n');
}

main().catch(function (err) { die('Failed: ' + (err && err.message ? err.message : err)); });
