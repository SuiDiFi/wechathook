import type { BotConfig, IHookClient, Logger } from "@wechathook/shared";
import type { MengtuInjectMessage } from "@wechathook/hook-adapter";
import { executeCallbacks } from "./callback-executor.js";
import type { HandleMessageCallback, SuperApiResponse } from "./types.js";

export interface BotServerRelayResult {
  callbacks: HandleMessageCallback[];
  executed: number;
  errors: number;
}

export class BotServerRelay {
  constructor(
    private config: BotConfig,
    private hook: IHookClient,
    private logger: Logger,
  ) {}

  get enabled(): boolean {
    return Boolean(this.config.botServer?.relayEnabled && this.config.botServer.url);
  }

  get url(): string {
    return (this.config.botServer?.url ?? "").replace(/\/$/, "");
  }

  /** inject 入站 raw → bot-server /super/msg/callback → rabbitr 出站 */
  async handleInjectRaw(raw: unknown): Promise<BotServerRelayResult | null> {
    if (!this.enabled) return null;

    const msg = raw as MengtuInjectMessage;
    const accWxid = msg.acc_wxid ?? msg.account_wxid ?? this.config.bot.botWxid ?? "";

    const body = {
      msg: raw,
      acc_wxid: accWxid,
      client_mode: "pc",
      kernel_mode: "inject",
      http_port: this.config.hook.httpServerPort ?? 19088,
    };

    const res = await fetch(`${this.url}/super/msg/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`bot-server callback HTTP ${res.status}`);
    }

    const json = (await res.json()) as SuperApiResponse<HandleMessageCallback[]>;
    const callbacks = json.data ?? [];

    if (callbacks.length === 0) {
      this.logger.debug("bot-server relay: no callbacks");
      return { callbacks, executed: 0, errors: 0 };
    }

    const { executed, errors } = await executeCallbacks(callbacks, this.hook, this.logger);
    return { callbacks, executed, errors };
  }
}
