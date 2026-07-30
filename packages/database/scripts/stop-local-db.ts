import path from "node:path";
import fs from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const root = path.resolve(__dirname, "../../..");
const env = path.join(root, ".env");
if (fs.existsSync(env)) {
  for (const raw of fs.readFileSync(env, "utf8").split(/\r?\n/)) {
    const index = raw.indexOf("=");
    if (index > 0 && !raw.trimStart().startsWith("#")) {
      process.env[raw.slice(0, index).trim()] ??= raw.slice(index + 1).trim();
    }
  }
}

const database = new EmbeddedPostgres({
  databaseDir: path.resolve(__dirname, "../.pgdata"),
  user: process.env.POSTGRES_USER ?? "xingyu",
  password: process.env.POSTGRES_PASSWORD ?? "",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  persistent: true,
});

database
  .stop()
  .then(() => console.log("[xingyu-db] PostgreSQL encerrado; dados preservados."))
  .catch((error) => {
    console.error(`[xingyu-db] Não foi possível encerrar: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
