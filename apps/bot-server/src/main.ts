import path from "node:path";
import { fileURLToPath } from "node:url";
import { BotServerEngine } from "@wechathook/bot-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const engine = new BotServerEngine({
    projectRoot,
    configPath: process.env.CONFIG_PATH ?? "config/bot.yaml",
    port: process.env.BOT_SERVER_PORT ? Number(process.env.BOT_SERVER_PORT) : 8788,
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await engine.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await engine.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
