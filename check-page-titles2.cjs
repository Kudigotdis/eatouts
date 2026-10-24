const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const m = s.match(/const PAGE_TITLES\s*=\s*\{([\s\S]*?)\n\};/);
if (m) {
  const re = /"([^"]+)"\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = re.exec(m[1]))) {
    console.log(JSON.stringify(match[1]), '=>', JSON.stringify(match[2]));
  }
}