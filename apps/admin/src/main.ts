import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAdminConfig } from "./config.js";
import { startAdminServer } from "./server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const config = loadAdminConfig(
    process.env.ADMIN_CONFIG ?? "config/admin.yaml",
    projectRoot,
  );
  await startAdminServer(config, projectRoot);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
