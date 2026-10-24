const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const m = s.match(/const PAGE_TITLES\s*=\s*\{([\s\S]*?)\n\};/);
if (m) {
  console.log('Match length:', m[0].length);
  console.log('First 200 chars:', m[0].substring(0, 200));
  console.log('---');
  console.log('Last 200 chars:', m[0].substring(m[0].length - 200));
}