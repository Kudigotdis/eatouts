const fs=require('fs');
const s=fs.readFileSync('assets/data/restaurant_listings/directory_runtime_data.js','utf8');
const i=s.indexOf('{');
const data=JSON.parse(s.slice(i));
const has = v => v && String(v).toLowerCase().includes('touchdown');
const out=data.restaurants.filter(r => [r.name,r.slug,r.id].some(has));
console.log(JSON.stringify(out));
