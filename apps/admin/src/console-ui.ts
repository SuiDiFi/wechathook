import fs from "node:fs";
import path from "node:path";
import type { Context, Hono } from "hono";
import type { AdminConfig } from "./config.js";

export function mountConsoleUi(app: Hono, config: AdminConfig, projectRoot: string): void {
  const consoleDir = path.join(projectRoot, "apps/admin/public/console");

  app.get("/console", (c) => c.redirect("/console/"));
  app.get("/console/", (c) => serveFile(c, consoleDir, "index.html", "text/html; charset=utf-8"));
  app.get("/console/app.js", (c) => serveFile(c, consoleDir, "app.js", "application/javascript; charset=utf-8"));
  app.get("/console/console.css", (c) => serveFile(c, consoleDir, "console.css", "text/css; charset=utf-8"));
}

function serveFile(c: Context, dir: string, name: string, type: string): Response {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) return c.text(`${name} missing`, 404);
  return new Response(fs.readFileSync(p), { headers: { "Content-Type": type } });
}
