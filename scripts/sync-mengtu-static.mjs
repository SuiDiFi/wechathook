#!/usr/bin/env node
/** 从 wx.wxmtu.com 同步萌兔 H5 静态资源（自动解析 index 中的 js/css hash） */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATIC = path.join(ROOT, "reference/mtrobot-agent-portal/static");
const AGENT_INDEX = path.join(STATIC, "agent/index.html");
const BASE = "https://wx.wxmtu.com";

const IMG_ASSETS = [
  "favicon.ico",
  "img/share-1.c8b8daf8.png",
  "img/share-icon-3.2678f88e.png",
  "img/authBg.c9d154e1.png",
  "img/main_header_bg.ca8a35dd.png",
  "img/des_kejitu.3cd321fc.png",
  "img/bug_group.f28ac97c.png",
  "img/index.51115ccf.png",
  "img/center.51a840e4.png",
  "img/group_center.63d4aeab.png",
  "img/icon-1.63c0a479.png",
  "img/icon-head.5793389e.png",
  "img/all.b983bfd5.png",
  "img/group_tip.6dda35d7.gif",
  "img/agent_3.44db9d1c.png",
  "img/sever.d3271e15.png",
  "img/group.7cd496ba.png",
  "img/instruct.a9b03280.png",
  "img/zhu.5ca277b4.png",
  "img/information.7a08f3e5.png",
  "img/operation.ba5d06c1.png",
  "img/agent_2.b08392e7.png",
  "img/tutorial.0eb77249.png",
  "img/header_img.18230581.png",
  "img/agent_4.71e2278d.png",
  "img/head.40740b2d.jpg",
  "img/agent_1.1c880c51.png",
  "img/error.7229b034.png",
];

function isHtml(buf) {
  const head = buf.subarray(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
  return head.startsWith("<!DOCTYPE") || head.startsWith("<html");
}

function parseBundleAssets(indexHtml) {
  const css = indexHtml.match(/css\/(app\.[a-f0-9]+\.css)/)?.[1];
  const js = indexHtml.match(/js\/(app\.[a-f0-9]+\.js)/)?.[1];
  if (!css || !js) throw new Error("无法从官方 index 解析 js/css hash");
  return [`css/${css}`, `js/${js}`, "static/config.js"];
}

async function download(rel) {
  const url = `${BASE}/${rel}`;
  const dest = path.join(STATIC, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (isHtml(buf)) throw new Error("got HTML shell instead of asset");
  fs.writeFileSync(dest, buf);
  console.log("OK", rel, buf.length);
  return buf.length;
}

let failed = 0;

try {
  const indexRes = await fetch(`${BASE}/agent/`, { redirect: "follow" });
  if (!indexRes.ok) throw new Error(`index HTTP ${indexRes.status}`);
  const indexHtml = await indexRes.text();
  if (!indexHtml.includes('id="app"')) throw new Error("official index invalid");

  fs.mkdirSync(path.dirname(AGENT_INDEX), { recursive: true });
  fs.writeFileSync(AGENT_INDEX, indexHtml, "utf8");
  console.log("OK agent/index.html", indexHtml.length);

  const bundles = parseBundleAssets(indexHtml);
  for (const rel of [...bundles, ...IMG_ASSETS]) {
    try {
      await download(rel);
    } catch (e) {
      console.error("FAIL", rel, e.message);
      failed++;
    }
  }
} catch (e) {
  console.error("SYNC ABORT:", e.message);
  failed++;
}

if (failed) process.exit(1);
console.log("MENGTU STATIC SYNC OK");
