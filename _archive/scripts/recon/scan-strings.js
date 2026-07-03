const fs = require("fs");
const path = require("path");

const files = process.argv.slice(2);
const keywords = [
  "http://", "https://", "wss://", "ws://",
  "socket", "SignalR", "Redis", "Swagger",
  "api/", "recvMsg", "chat_message", "cmd_message",
  "萌兔", "rabbit", "mengtu", "xvsvip",
  "localhost", "127.0.0.1", "Jwt", "Bearer",
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log("MISSING:", f);
    continue;
  }
  const buf = fs.readFileSync(f);
  const latin = buf.toString("latin1");
  const utf16 = buf.toString("utf16le");
  const hits = new Set();

  for (const text of [latin, utf16]) {
    for (const kw of keywords) {
      let idx = 0;
      while ((idx = text.indexOf(kw, idx)) !== -1) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + 120);
        const slice = text.slice(start, end).replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
        if (slice.trim().length > 8) hits.add(slice.trim());
        idx += kw.length;
        if (hits.size > 60) break;
      }
    }
  }

  console.log("\n===", path.basename(f), "hits:", hits.size, "===");
  [...hits].slice(0, 35).forEach((h) => console.log(h));
}
