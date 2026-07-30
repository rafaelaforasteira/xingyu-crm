import path from "node:path";
import fs from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const dataDir = path.join(__dirname, "..", ".pgdata");
const port = Number(process.env.POSTGRES_PORT || 5432);

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  const database = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: process.env.POSTGRES_USER || "xingyu",
    password: process.env.POSTGRES_PASSWORD || "xingyu",
    port,
    persistent: true,
  });

  console.info(`[xingyu-db] Starting embedded PostgreSQL on port ${port}...`);
  await database.initialise();
  await database.start();
  try {
    await database.createDatabase(process.env.POSTGRES_DB || "xingyu_crm");
  } catch {
    // database may already exist
  }
  console.info("[xingyu-db] PostgreSQL is ready.");
  console.info(
    `DATABASE_URL=postgresql://${process.env.POSTGRES_USER || "xingyu"}:${process.env.POSTGRES_PASSWORD || "xingyu"}@localhost:${port}/${process.env.POSTGRES_DB || "xingyu_crm"}?schema=public`,
  );
  console.info("[xingyu-db] Press Ctrl+C to stop.");

  const stop = async () => {
    console.info("[xingyu-db] Stopping...");
    await database.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
