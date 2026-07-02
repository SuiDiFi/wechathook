import type { SrcGetFormField, FormValues } from "./types.js";

/** 将萌兔 srcGet form 数组转为 name -> value 映射 */
export function parseFormValues(form: SrcGetFormField[] | undefined): FormValues {
  if (!form?.length) return {};
  const out: FormValues = {};
  for (const field of form) {
    if (field.name) out[field.name] = field.value;
  }
  return out;
}

export function isOpEnabled(values: FormValues): boolean {
  const sw = values.switch_checked;
  if (sw === undefined) return true;
  return sw === true || sw === "true" || sw === 1 || sw === "1";
}

export function asString(v: FormValues[string], fallback = ""): string {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

export function asInt(v: FormValues[string], fallback: number): number {
  const n = Number.parseInt(asString(v), 10);
  return Number.isNaN(n) ? fallback : n;
}
