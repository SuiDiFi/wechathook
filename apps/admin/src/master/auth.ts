import type { AdminConfig } from "../config.js";

export interface MasterSession {
  username: string;
  token: string;
  createdAt: number;
}

const sessions = new Map<string, MasterSession>();

export function masterCredentials(config: AdminConfig): { username: string; password: string } {
  return {
    username: config.master?.username ?? process.env.MASTER_USER ?? "admin",
    password: config.master?.password ?? process.env.MASTER_PASSWORD ?? "123456",
  };
}

export function masterLogin(config: AdminConfig, username: string, password: string): MasterSession | null {
  const cred = masterCredentials(config);
  if (username !== cred.username || password !== cred.password) return null;
  const token = `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const session: MasterSession = { username, token, createdAt: Date.now() };
  sessions.set(token, session);
  return session;
}

export function masterLogout(token: string): void {
  sessions.delete(token);
}

export function verifyMasterToken(token: string | undefined): MasterSession | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export function extractMasterToken(headers: {
  get: (name: string) => string | undefined;
}): string | undefined {
  const auth = headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return headers.get("x-master-token") ?? undefined;
}

/** 总控 API 鉴权中间件 */
export function masterAuthMiddleware(config: AdminConfig) {
  return async (
    c: {
      req: { header: (n: string) => string | undefined };
      json: (b: unknown, s?: number) => Response;
    },
    next: () => Promise<void>,
  ) => {
    const token = extractMasterToken({
      get: (n) => c.req.header(n),
    });
    if (!verifyMasterToken(token)) {
      return c.json({ status: 0, message: "请先登录官方总控", data: null }, 401);
    }
    await next();
  };
}
