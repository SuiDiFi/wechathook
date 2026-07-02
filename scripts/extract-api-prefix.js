const fs = require("fs");
const t = fs.readFileSync(process.argv[2], "utf8");
const re = /["'](\/api\/[^"']{3,80})["']/g;
const s = new Set();
let m;
while ((m = re.exec(t))) s.add(m[1]);
console.log([...s].sort().join("\n"));
