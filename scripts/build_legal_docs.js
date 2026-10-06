const fs = require('fs');
const path = require('path');

const base = 'assets/data';
const configs = [
  {
    json: path.join(base, 'eatouts_terms_of_service.json'),
    js: path.join(base, 'eatouts_terms_of_service.js'),
    global: 'EATOUTS_TERMS_OF_SERVICE'
  },
  {
    json: path.join(base, 'eatouts_privacy_policy.json'),
    js: path.join(base, 'eatouts_privacy_policy.js'),
    global: 'EATOUTS_PRIVACY_POLICY'
  }
];

let ok = true;
for (const c of configs) {
  const raw = fs.readFileSync(c.json, 'utf8');
  JSON.parse(raw);
  const out = '/* Auto-generated from ' + path.basename(c.json) + ' - do not edit manually. */\n' +
    'window.' + c.global + ' = ' + raw.trim() + ';\n';
  fs.writeFileSync(c.js, out);
  console.log(c.global + ' <- ' + c.json + ' (' + out.length + ' bytes)');
  const round = JSON.parse(fs.readFileSync(c.js, 'utf8').slice(out.indexOf('{'), out.lastIndexOf(';')));
  if (JSON.stringify(round) !== JSON.stringify(JSON.parse(raw))) {
    console.error('MISMATCH: ' + c.global);
    ok = false;
  }
}
if (!ok) process.exit(1);