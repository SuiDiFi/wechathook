import type { AdminConfig } from "../config.js";

/** 萌兔 API 统一响应壳 */
export interface ApiEnvelope<T = unknown> {
  status: number;
  message: string;
  data?: T;
}

/** buildXxx() 统一入参 */
export interface ProviderContext {
  projectRoot: string;
  config: AdminConfig;
}

export type ApiBuilder<T = unknown> = (ctx: ProviderContext) => ApiEnvelope<T> | unknown;

export function providerCtx(projectRoot: string, config: AdminConfig): ProviderContext {
  return { projectRoot, config };
}

export function apiOk<T>(data: T, message = "成功"): ApiEnvelope<T> {
  return { status: 1, message, data };
}
