const fs   = require("fs");
const path = require("path");

const MENUS_DIR  = "C:/Users/Kudzanai/Documents/2025/App Developments/EatOuts App/assets/Kenya/menus";
const OUTPUT_DIR = "C:/Users/Kudzanai/Documents/2025/App Developments/EatOuts App/assets/Kenya/structured_output";
const PARSED_DIR = path.join(OUTPUT_DIR, "parsed");

fs.mkdirSync(PARSED_DIR, { recursive: true });

const names = fs.readdirSync(MENUS_DIR).filter(n => n.toLowerCase().endsWith(".js")).sort();
console.log("Found " + names.length + " .js files");

const summary = {};
const errors  = [];

for (let i = 0; i < names.length; i++) {
  const name = names[i];
  const fullPath = path.join(MENUS_DIR, name);
  process.stdout.write("[" + String(i + 1).padStart(3, "0") + "/" + names.length + "] " + name + " ... ");

  try {
    let data;
    try {
      delete require.cache[require.resolve(fullPath)];
      data = require(fullPath);
    } catch (e1) {
      const raw = fs.readFileSync(fullPath, "utf8");
      const cleaned = raw
        .replace(/^\s*module\.exports\s*=\s*/, "")
        .replace(/^\s*export\s+default\s+/, "")
        .replace(/;\s*$/, "");
      data = eval("(" + cleaned + ")");
    }

    const outName = name.replace(/\.js$/i, ".json");
    fs.writeFileSync(path.join(PARSED_DIR, outName), JSON.stringify(data, null, 2), "utf8");

    let items = [];
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.items)) items = data.items;

    const fields = new Set();
    const cats   = new Set();
    for (const it of items) {
      if (it && typeof it === "object") {
        Object.keys(it).forEach(k => fields.add(k));
        cats.add(String(it.category || "Uncategorized").trim());
      }
    }

    summary[name] = {
      restaurant_name: (data && (data.restaurant_name || data.name)) || null,
      is_array_root: Array.isArray(data),
      top_level_keys: (data && typeof data === "object" && !Array.isArray(data)) ? Object.keys(data) : [],
      total_items: items.length,
      item_field_names: [...fields].sort(),
      categories: [...cats].sort()
    };

    console.log("ok (" + items.length + " items)");
  } catch (e) {
    errors.push({ file: name, error: String(e && e.message || e) });
    console.log("FAILED: " + (e && e.message));
  }
}

fs.writeFileSync(path.join(OUTPUT_DIR, "menu_analysis_report.json"), JSON.stringify(summary, null, 2), "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "parse_errors.json"),          JSON.stringify(errors,  null, 2), "utf8");

console.log("");
console.log("DONE. Parsed " + Object.keys(summary).length + " / " + names.length + ". Errors: " + errors.length);
if (errors.length) console.log("First error: " + JSON.stringify(errors[0]));
