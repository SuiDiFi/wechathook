const fs = require("fs");
const file = process.argv[2];
const t = fs.readFileSync(file, "utf8");
const patterns = [
  /["'](\/[a-zA-Z][a-zA-Z0-9_\-\/\{\}]{2,80})["']/g,
  /https?:\\\/\\\/[a-zA-Z0-9._-]+(?:\\\/[a-zA-Z0-9._\-\/\{\}]+)+/g,
];
const hits = new Set();
for (const re of patterns) {
  let m;
  while ((m = re.exec(t))) {
    const v = m[0].replace(/^["']|["']$/g, "").replace(/\\\//g, "/");
    if (
      v.includes("agent") ||
      v.includes("login") ||
      v.includes("wxid") ||
      v.includes("robot") ||
      v.includes("group") ||
      v.includes("game") ||
      v.includes("box") ||
      v.includes("sign") ||
      v.includes("proxy") ||
      v.includes("api") ||
      v.includes("wxmtu")
    ) {
      hits.add(v);
    }
  }
}
console.log([...hits].sort().join("\n"));
