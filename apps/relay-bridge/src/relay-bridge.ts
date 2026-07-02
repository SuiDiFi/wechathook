import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { createLogger } from "./config.js";
import type { RelayBridgeConfig } from "./config.js";

function targetBase(config: RelayBridgeConfig, pathname: string): string {
  if (pathname.startsWith("/super/")) return config.botServer.replace(/\/$/, "");
  if (config.superOnly) return config.botServer.replace(/\/$/, "");
  return config.upstream.mengtuApi.replace(/\/$/, "");
}

export function createRelayBridgeApp(config: RelayBridgeConfig): Hono {
  const app = new Hono();
  const logger = createLogger("relay-bridge");

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "relay-bridge",
      botServer: config.botServer,
      upstream: config.upstream.mengtuApi,
      superOnly: config.superOnly,
    }),
  );

  const forward = async (c: {
    req: {
      method: string;
      path: string;
      header: (n: string) => string | undefined;
      arrayBuffer: () => Promise<ArrayBuffer>;
    };
  }) => {
    const url = new URL(c.req.path, "http://local");
    const pathname = url.pathname;
    const base = targetBase(config, pathname);
    const qs = url.search || "";
    const targetUrl = `${base}${pathname}${qs}`;

    const headers = new Headers();
    const ct = c.req.header("content-type");
    if (ct) headers.set("content-type", ct);

    const body =
      c.req.method === "GET" || c.req.method === "HEAD"
        ? undefined
        : await c.req.arrayBuffer();

    if (config.verbose) {
      logger.info(`${c.req.method} ${pathname} -> ${targetUrl}`);
    }

    const res = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    });

    const resBody = await res.arrayBuffer();
    const outHeaders = new Headers();
    const resCt = res.headers.get("content-type");
    if (resCt) outHeaders.set("content-type", resCt);

    return new Response(resBody, { status: res.status, headers: outHeaders });
  };

  app.all("/super/*", forward);
  app.all("/api/*", forward);

  return app;
}

export async function startRelayBridge(
  config: RelayBridgeConfig,
  projectRoot?: string,
): Promise<void> {
  const logger = createLogger("relay-bridge");
  const { serve } = await import("@hono/node-server");
  const app = createRelayBridgeApp(config);
  const handler = app.fetch.bind(app);

  serve(
    { fetch: handler, hostname: config.listen.host, port: config.listen.port },
    () => {
      logger.info(`Listening http://${config.listen.host}:${config.listen.port}`);
      logger.info(`/super/* -> ${config.botServer}`);
      if (!config.superOnly) {
        logger.info(`/api/* -> ${config.upstream.mengtuApi}`);
      }
    },
  );

  const tls = config.tls;
  if (!tls?.enabled) return;

  const root = projectRoot ?? process.cwd();
  const certPath = path.isAbsolute(tls.cert) ? tls.cert : path.join(root, tls.cert);
  const keyPath = path.isAbsolute(tls.key) ? tls.key : path.join(root, tls.key);

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    logger.warn(`TLS enabled but cert/key missing: ${certPath}, ${keyPath}`);
    logger.warn("Run: node scripts/generate-dev-tls.mjs");
    return;
  }

  const https = await import("node:https");
  const server = https.createServer(
    { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
    async (req, res) => {
      const url = `https://${req.headers.host ?? tls.host}${req.url ?? "/"}`;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const response = await handler(
        new Request(url, { method: req.method, headers, body }),
      );
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      const buf = Buffer.from(await response.arrayBuffer());
      res.end(buf);
    },
  );

  server.listen(tls.port, tls.host, () => {
    logger.info(`Listening https://${tls.host}:${tls.port} (api.wxmtu.com hosts hijack)`);
  });
}
