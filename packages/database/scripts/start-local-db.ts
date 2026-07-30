import path from "node:path";
import fs from "node:fs";
import net from "node:net";
import EmbeddedPostgres from "embedded-postgres";

const repositoryRoot = path.resolve(__dirname, "../../..");
const envFile = path.join(repositoryRoot, ".env");
const dataDir = path.resolve(__dirname, "../.pgdata");

function loadRootEnvironment() {
  if (!fs.existsSync(envFile)) {
    throw new Error("Arquivo .env não encontrado. Execute pnpm setup:local.");
  }
  for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function isPortOpen(port: number, timeoutMs = 750): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function backupIncompleteCluster() {
  if (!fs.existsSync(dataDir)) return;
  const entries = fs.readdirSync(dataDir);
  if (entries.length === 0) return;
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const backupDir = path.join(path.dirname(dataDir), `.pgdata-backup-${stamp}`);
  fs.renameSync(dataDir, backupDir);
  console.warn(`[xingyu-db] Cluster incompleto preservado em ${backupDir}`);
}

async function waitUntilReady(database: EmbeddedPostgres, databaseName: string) {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const client = database.getPgClient(databaseName);
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(
    `PostgreSQL não ficou disponível em 30s: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function main() {
  loadRootEnvironment();
  const port = Number(process.env.POSTGRES_PORT ?? 5432);
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const databaseName = process.env.POSTGRES_DB;
  if (!user || !password || !databaseName || !Number.isInteger(port)) {
    throw new Error("POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB e POSTGRES_PORT são obrigatórios.");
  }

  const pgVersionFile = path.join(dataDir, "PG_VERSION");
  const isInitialized = fs.existsSync(pgVersionFile);
  if (await isPortOpen(port)) {
    console.info(`[xingyu-db] Porta ${port} já está em uso; reutilizando PostgreSQL em execução.`);
    return;
  }

  if (!isInitialized) backupIncompleteCluster();
  fs.mkdirSync(dataDir, { recursive: true });

  const database = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  if (!isInitialized) {
    console.info(`[xingyu-db] Inicializando novo cluster persistente em ${dataDir}...`);
    await database.initialise();
  } else {
    console.info(`[xingyu-db] Cluster existente detectado (${fs.readFileSync(pgVersionFile, "utf8").trim()}).`);
  }

  console.info(`[xingyu-db] Iniciando PostgreSQL na porta ${port}...`);
  await database.start();
  try {
    await waitUntilReady(database, "postgres");
    const admin = database.getPgClient("postgres");
    await admin.connect();
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    await admin.end();
    if (exists.rowCount === 0) {
      await database.createDatabase(databaseName);
      console.info(`[xingyu-db] Banco ${databaseName} criado.`);
    }
    await waitUntilReady(database, databaseName);
  } catch (error) {
    await database.stop().catch(() => undefined);
    throw error;
  }

  console.info(`[xingyu-db] PostgreSQL pronto; dados persistentes em ${dataDir}.`);
  console.info("[xingyu-db] Pressione Ctrl+C para encerrar.");

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.info("[xingyu-db] Encerrando PostgreSQL...");
    await database.stop().catch((error) => console.error("[xingyu-db] Falha ao encerrar:", error));
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  await new Promise(() => undefined);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[xingyu-db] ${message}`);
  process.exit(1);
});
