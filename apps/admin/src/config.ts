import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  AGENT_UID_START,
  DEFAULT_AGENT_PASSWORD,
  DEFAULT_AGENT_USERNAME,
} from "./agent-defaults.js";

export interface AdminConfig {
  listen: { host: string; port: number };
  botServer: string;
  configPath: string;
  auth: { token: string };
  master?: { username?: string; password?: string };
  login?: {
    username?: string;
    password?: string;
    uid?: number;
  };
}

const DEFAULTS: AdminConfig = {
  listen: { host: "127.0.0.1", port: 8790 },
  botServer: "http://127.0.0.1:8788",
  configPath: "config/bot.yaml",
  auth: { token: "" },
};

export function loadAdminConfig(configPath: string, projectRoot: string): AdminConfig {
  const abs = path.isAbsolute(configPath)
    ? configPath
    : path.join(projectRoot, configPath);
  if (!fs.existsSync(abs)) return DEFAULTS;

  const raw = yaml.load(fs.readFileSync(abs, "utf8")) as Partial<AdminConfig>;
  return {
    listen: { ...DEFAULTS.listen, ...raw.listen },
    botServer: raw.botServer ?? process.env.BOT_SERVER_URL ?? DEFAULTS.botServer,
    configPath: raw.configPath ?? DEFAULTS.configPath,
    auth: { token: raw.auth?.token ?? process.env.ADMIN_TOKEN ?? "" },
    master: {
      username: raw.master?.username ?? process.env.MASTER_USER ?? "admin",
      password: raw.master?.password ?? process.env.MASTER_PASSWORD ?? "123456",
    },
    login: {
      username: raw.login?.username ?? process.env.ADMIN_USER ?? DEFAULT_AGENT_USERNAME,
      password: raw.login?.password ?? process.env.ADMIN_PASSWORD ?? DEFAULT_AGENT_PASSWORD,
      uid: raw.login?.uid ?? AGENT_UID_START,
    },
  };
}

export function createLogger(scope: string) {
  const p = `[${scope}]`;
  return {
    info: (m: string, ...a: unknown[]) => console.log(p, m, ...a),
    warn: (m: string, ...a: unknown[]) => console.warn(p, m, ...a),
    error: (m: string, ...a: unknown[]) => console.error(p, m, ...a),
  };
}
