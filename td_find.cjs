const fs = require('fs');
const s = fs.readFileSync('assets/data/restaurant_listings/directory_runtime_data.js','utf8');
const i = s.indexOf('{');
const data = JSON.parse(s.slice(i));
const out = data.restaurants.filter(function(r){ return (r.name||'').toLowerCase().indexOf('touchdown') !== -1; });
fs.writeFileSync('td.json', JSON.stringify(out));
console.log('total', data.restaurants.length, 'td', out.length);
