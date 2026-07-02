#!/usr/bin/env node
/**
 * 生成本机 HTTPS 自签证书（CN=api.wxmtu.com），供 relay-bridge TLS 联调萌兔壳。
 * 需要系统已安装 openssl（Git for Windows 自带）。
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "config/certs/dev");
const certFile = path.join(outDir, "dev-cert.pem");
const keyFile = path.join(outDir, "dev-key.pem");

function hasOpenssl(): boolean {
  const r = spawnSync("openssl", ["version"], { encoding: "utf8" });
  return r.status === 0;
}

function generate(): void {
  fs.mkdirSync(outDir, { recursive: true });
  const subj = "/CN=api.wxmtu.com/O=wechathook-dev";
  const san = "subjectAltName=DNS:api.wxmtu.com,DNS:localhost,IP:127.0.0.1";
  const cmd = [
    "req -x509 -newkey rsa:2048 -nodes",
    `-keyout "${keyFile}"`,
    `-out "${certFile}"`,
    "-days 825",
    `-subj "${subj}"`,
    `-addext "${san}"`,
  ].join(" ");
  execSync(`openssl ${cmd}`, { stdio: "inherit", shell: true });
  console.log(`\nWrote:\n  ${certFile}\n  ${keyFile}`);
  console.log("\nEnable TLS in config/relay-bridge.yaml:");
  console.log("  tls:\n    enabled: true");
  console.log("\nThen (admin): .\\scripts\\setup-hosts-mengtu.ps1 -Enable");
  console.log("Start relay: pnpm start:relay (needs admin for port 443)");
}

if (!hasOpenssl()) {
  console.error("openssl not found. Install Git for Windows or OpenSSL, then re-run.");
  process.exit(1);
}

generate();
