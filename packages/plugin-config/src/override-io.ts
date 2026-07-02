import fs from "node:fs";
import path from "node:path";
import type { FormValues } from "./types.js";

export function readFlatOverride(filePath: string): FormValues | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as FormValues;
    return raw;
  } catch {
    return null;
  }
}

export function mergeFormValues(base: FormValues, override: FormValues | null): FormValues {
  if (!override) return base;
  return { ...base, ...override };
}

export function agentOverridePath(projectRoot: string, op: string): string {
  return path.join(projectRoot, "data/agent-overrides", `${op}.json`);
}

export function groupOverridePath(projectRoot: string, roomId: string, op: string): string {
  return path.join(projectRoot, "data/group-overrides", roomId, `${op}.json`);
}
