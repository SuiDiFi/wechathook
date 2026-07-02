import type { BotConfig } from "@wechathook/shared";

export interface Hook41827InjectConfig {
  recivemode: "http" | "tcp";
  tcp_ip: string;
  tcp_port: number;
  http_server_port: number;
  http_callback_url: string;
  usedefault: boolean;
  start_server_while_login: boolean;
}

/** 生成 Hook 4.1.8.27 注入 JSON 配置 */
export function buildHook41827InjectConfig(
  config: BotConfig,
  gatewayPort: number,
): Hook41827InjectConfig {
  const receiveMode = config.hook.receiveMode ?? "http";
  const callbackPath = config.hook.callbackPath ?? "/api/recvMsg";

  return {
    recivemode: receiveMode,
    tcp_ip: config.hook.tcpHost ?? "127.0.0.1",
    tcp_port: config.hook.tcpPort ?? 61108,
    http_server_port: config.hook.httpServerPort ?? 19088,
    http_callback_url: `http://127.0.0.1:${gatewayPort}${callbackPath}`,
    usedefault: false,
    start_server_while_login: true,
  };
}

/** 打印 inject.exe 命令行（供 README / 调试） */
export function formatInjectCommand(
  wechatExe: string,
  dllPath: string,
  injectConfig: Hook41827InjectConfig,
): string {
  const json = JSON.stringify(injectConfig);
  return `"x64 inject.exe" "${wechatExe}" "${dllPath}" "${json}"`;
}
