import path from "node:path";
import { fileURLToPath } from "node:url";
import { BotEngine } from "@wechathook/bot-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const engine = new BotEngine({
    projectRoot,
    configPath: process.env.CONFIG_PATH ?? "config/bot.yaml",
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
