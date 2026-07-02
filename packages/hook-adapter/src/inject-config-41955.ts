import type { BotConfig } from "@wechathook/shared";
import type { Hook41827InjectConfig } from "./inject-config.js";

/** 萌兔 rabbitr.dll + Weixin 4.1.9.55 注入配置（JSON 结构与 Hook 4.x 同族） */
export type Rabbitr41955InjectConfig = Hook41827InjectConfig;

const DEFAULT_DLL = "D:\\Mtrobot\\system\\rabbitr.dll";
const DEFAULT_WECHAT = "C:\\Program Files\\Tencent\\Weixin\\Weixin.exe";

export function buildRabbitr41955InjectConfig(
  config: BotConfig,
  gatewayPort: number,
): Rabbitr41955InjectConfig {
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

export function formatRabbitr41955InjectCommand(config: BotConfig, gatewayPort: number): string {
  const wechatExe = config.rabbitr?.wechatExe ?? DEFAULT_WECHAT;
  const dllPath = config.rabbitr?.dllPath ?? DEFAULT_DLL;
  const injectConfig = buildRabbitr41955InjectConfig(config, gatewayPort);
  const json = JSON.stringify(injectConfig);
  return `"x64 inject.exe" "${wechatExe}" "${dllPath}" "${json}"`;
}

export function getRabbitr41955Paths(config: BotConfig): {
  dllPath: string;
  wechatExe: string;
  wechatVersion: string;
} {
  return {
    dllPath: config.rabbitr?.dllPath ?? DEFAULT_DLL,
    wechatExe: config.rabbitr?.wechatExe ?? DEFAULT_WECHAT,
    wechatVersion: config.rabbitr?.wechatVersion ?? "4.1.9.55",
  };
}
