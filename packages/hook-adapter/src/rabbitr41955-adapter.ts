import type { GroupMember, IHookClient, HookApiResponse } from "@wechathook/shared";

export interface Rabbitr41955AdapterOptions {
  /** rabbitr HttpGateway，默认 http://127.0.0.1:19088 */
  baseUrl: string;
  timeoutMs?: number;
}

interface RabbitrApiResponse {
  code?: number;
  msg?: string;
  errCode?: number;
  errMsg?: string;
  success?: boolean;
}

/**
 * 萌兔 inject + rabbitr.dll（Weixin 4.1.9.55）出站适配。
 * 实测：发文本 POST /r/stm { t: roomId, c: content }
 */
export class Rabbitr41955Adapter implements IHookClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: Rabbitr41955AdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async sendText(roomId: string, msg: string): Promise<void> {
    await this.post("/r/stm", { t: roomId, c: msg });
  }

  async sendAt(roomId: string, wxids: string, msg: string): Promise<void> {
    const prefix = wxids ? `@${wxids} ` : "";
    await this.sendText(roomId, `${prefix}${msg}`);
  }

  async kickMember(_roomId: string, _wxid: string): Promise<void> {
    // MVP：rabbitr 踢人 API 待归档后补
  }

  async getGroupMembers(_roomId: string): Promise<GroupMember[]> {
    return [];
  }

  /** 萌兔登录后拉群列表用的 SQL 网关（msg_type 16 也会走此路径） */
  async querySql(db: string, sq: string): Promise<unknown> {
    const res = await this.post<unknown>("/r/sqe", { db, sq });
    return res.data;
  }

  private async post<T = unknown>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<HookApiResponse<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Rabbitr ${path} failed (${res.status}): ${text}`);
      }

      const json = (await res.json()) as RabbitrApiResponse & { data?: T };
      const code = json.code ?? json.errCode;
      if (code !== undefined && code !== 0 && code !== 1) {
        throw new Error(`Rabbitr ${path} error: ${json.msg ?? json.errMsg ?? "unknown"}`);
      }
      return { code: code ?? 0, msg: json.msg ?? json.errMsg, data: json.data as T };
    } finally {
      clearTimeout(timer);
    }
  }
}
