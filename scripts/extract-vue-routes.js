const fs = require("fs");
const t = fs.readFileSync(process.argv[2], "utf8");
const re = /path:\s*["']([^"']+)["']/g;
const s = new Set();
let m;
while ((m = re.exec(t))) s.add(m[1]);
for (const p of [...s].sort()) {
  if (/agent|group|login|member|center|code|buy|template|qr/i.test(p)) {
    console.log(p);
  }
}
