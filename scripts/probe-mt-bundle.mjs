import fs from "node:fs";
const s = fs.readFileSync("reference/mtrobot-agent-portal/static/js/app.d31f1d00.js", "utf8");
for (const k of ["mode:\"history\"", "mode:\"hash\"", "base:\"/agent\"", "萌兔智能管家", "agent-center", "van-tabbar"]) {
  console.log(k, s.includes(k));
}
