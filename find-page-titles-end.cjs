const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const idx = s.indexOf('const PAGE_TITLES');
let depth = 0;
let inStr = false;
let start = s.indexOf('{', idx);
for (let i = start; i < s.length; i++) {
  const c = s[i];
  if (c === '"' && !inStr) { inStr = true; }
  else if (c === '"' && inStr) { inStr = false; }
  else if (!inStr) {
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { console.log('Object ends at position', i); console.log('Context:', JSON.stringify(s.substring(i - 30, i + 30))); break; } }
  }
}