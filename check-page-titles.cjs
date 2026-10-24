const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const m = s.match(/const PAGE_TITLES\s*=\s*\{([\s\S]*?)\n\};/);
if (m) {
  const lines = m[1].split('\n');
  console.log('Total lines in PAGE_TITLES block:', lines.length);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.includes('return') || t.includes('?')) {
      console.log('Line', i + 1, ':', t.substring(0, 120));
    }
  }
}