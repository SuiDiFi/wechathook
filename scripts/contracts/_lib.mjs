#!/usr/bin/env node
/** 契约测试公共工具 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

export function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

export async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export async function serviceUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function runNodeScript(rel, env = {}) {
  const r = spawnSync(process.execPath, [path.join(ROOT, rel)], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

export function section(title) {
  console.log(`\n=== ${title} ===`);
}

export function pass(msg) {
  console.log("PASS", msg);
}

export function skip(msg) {
  console.log("SKIP", msg);
}

export function fail(msg) {
  console.error("FAIL", msg);
}
