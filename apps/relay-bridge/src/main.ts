import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRelayBridgeConfig } from "./config.js";
import { startRelayBridge } from "./relay-bridge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const config = loadRelayBridgeConfig(
    process.env.RELAY_CONFIG ?? "config/relay-bridge.yaml",
    projectRoot,
  );
  await startRelayBridge(config, projectRoot);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
