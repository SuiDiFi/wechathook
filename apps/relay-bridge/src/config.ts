import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export interface TlsConfig {
  enabled: boolean;
  host: string;
  port: number;
  cert: string;
  key: string;
}

export interface RelayBridgeConfig {
  listen: { host: string; port: number };
  upstream: { mengtuApi: string };
  botServer: string;
  superOnly: boolean;
  verbose: boolean;
  tls?: TlsConfig;
}

const DEFAULT_TLS: TlsConfig = {
  enabled: false,
  host: "0.0.0.0",
  port: 443,
  cert: "config/certs/dev/dev-cert.pem",
  key: "config/certs/dev/dev-key.pem",
};

const DEFAULTS: RelayBridgeConfig = {
  listen: { host: "127.0.0.1", port: 8789 },
  upstream: { mengtuApi: "https://api.wxmtu.com" },
  botServer: "http://127.0.0.1:8788",
  superOnly: true,
  verbose: true,
  tls: DEFAULT_TLS,
};

export function loadRelayBridgeConfig(configPath: string, projectRoot: string): RelayBridgeConfig {
  const abs = path.isAbsolute(configPath)
    ? configPath
    : path.join(projectRoot, configPath);
  if (!fs.existsSync(abs)) return DEFAULTS;

  const raw = yaml.load(fs.readFileSync(abs, "utf8")) as Partial<RelayBridgeConfig>;
  const tlsRaw = raw.tls as Partial<TlsConfig> | undefined;
  return {
    listen: { ...DEFAULTS.listen, ...raw.listen },
    upstream: { ...DEFAULTS.upstream, ...raw.upstream },
    botServer: raw.botServer ?? DEFAULTS.botServer,
    superOnly: raw.superOnly ?? DEFAULTS.superOnly,
    verbose: raw.verbose ?? DEFAULTS.verbose,
    tls: tlsRaw
      ? { ...DEFAULT_TLS, ...tlsRaw }
      : DEFAULT_TLS,
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
