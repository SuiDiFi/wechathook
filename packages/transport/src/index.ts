import { Hook4xAdapter, Rabbitr41955Adapter } from "@wechathook/hook-adapter";
import type { BotConfig, IHookClient, TransportMode } from "@wechathook/shared";

export interface TransportHandle {
  mode: TransportMode;
  client: IHookClient;
}

export function resolveTransportMode(config: BotConfig): TransportMode {
  return config.transport?.mode ?? "hook41827";
}

export function createTransport(config: BotConfig): TransportHandle {
  const mode = resolveTransportMode(config);
  const baseUrl = config.hook.baseUrl;

  switch (mode) {
    case "rabbitr41955":
      return { mode, client: new Rabbitr41955Adapter({ baseUrl }) };
    case "hook41827":
    default:
      return { mode, client: new Hook4xAdapter({ baseUrl }) };
  }
}

export type { TransportMode };
