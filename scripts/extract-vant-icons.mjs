import fs from "node:fs";
import path from "node:path";

const src = path.join("reference/mtrobot-agent-portal/static/css/app.eb257a52.css");
const out = path.join("apps/admin/public/agent/vant-icons.css");
const css = fs.readFileSync(src, "utf8");

const faces = [...css.matchAll(/@font-face\{[^}]+\}/g)]
  .map((m) => m[0])
  .filter((f) => /vant|iconfont/i.test(f));

const base = css.match(/\.van-icon\{[^}]+\}/)?.[0] ?? "";
const pseudo = css.match(/\.van-icon:before\{[^}]+\}/)?.[0] ?? "";
const icons = [...css.matchAll(/\.van-icon-[a-z0-9-]+:before\{content:"\\[^"]+"\}/g)].map((m) => m[0]);

fs.writeFileSync(out, `${faces.join("")}${base}${pseudo}${icons.join("")}`);
console.log(`OK ${icons.length} icons -> ${out}`);
