import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const pgData = path.join(root, "packages", "database", ".pgdata");
const children = new Set();
const pnpmCli = process.env.npm_execpath;

function ensureEnv() {
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath, fs.constants.COPYFILE_EXCL);
    console.log("[local] .env criado a partir de .env.example.");
  }
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não foi definida. Execute pnpm setup:local ou configure o arquivo .env na raiz.",
    );
  }
}

function portOpen(port, timeout = 500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function waitForPort(port, timeout = 45_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await portOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`A porta ${port} não ficou disponível em ${timeout / 1000}s.`);
}

async function waitForHealth(url, timeout = 60_000) {
  const deadline = Date.now() + timeout;
  let last = "sem resposta";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      last = `HTTP ${response.status}`;
      if (response.ok && (await response.json()).database === "up") return;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`API não ficou saudável: ${last}`);
}

function launch(args, label, stdio = "inherit") {
  const command = pnpmCli ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const commandArgs = pnpmCli ? [pnpmCli, ...args] : args;
  const child = spawn(command, commandArgs, {
    cwd: root,
    env: process.env,
    stdio,
    windowsHide: true,
    shell: !pnpmCli && process.platform === "win32",
  });
  children.add(child);
  child.once("exit", () => children.delete(child));
  child.once("error", (error) => console.error(`[${label}] ${error.message}`));
  return child;
}

function run(args, label) {
  return new Promise((resolve, reject) => {
    const child = launch(args, label);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} terminou com código ${code}`)),
    );
  });
}

async function stopChildren() {
  const running = [...children];
  for (const child of running.reverse()) child.kill("SIGTERM");
  await Promise.all(
    running.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) return resolve();
          child.once("exit", resolve);
          setTimeout(resolve, 5_000);
        }),
    ),
  );
}

async function ensureDatabase() {
  const port = Number(process.env.POSTGRES_PORT ?? 5432);
  if (await portOpen(port)) {
    console.log(`[local] PostgreSQL já está disponível na porta ${port}.`);
    return null;
  }
  const child = launch(["db:start"], "database");
  const earlyExit = new Promise((_, reject) =>
    child.once("exit", (code) => reject(new Error(`Banco encerrou antes do readiness (${code}).`))),
  );
  await Promise.race([waitForPort(port), earlyExit]);
  console.log(`[local] PostgreSQL disponível na porta ${port}.`);
  return child;
}

async function setup() {
  ensureEnv();
  if (!fs.existsSync(path.join(root, "node_modules"))) {
    throw new Error("Dependências ausentes. Execute pnpm install antes de pnpm setup:local.");
  }
  await ensureDatabase();
  await run(["db:generate"], "Prisma generate");
  await run(["db:migrate:deploy"], "Prisma migrate deploy");
  await run(["db:seed"], "Prisma seed");
  console.log("[local] Setup concluído. Execute pnpm dev:local.");
}

async function dev() {
  ensureEnv();
  const apiPort = Number(process.env.API_PORT ?? 3333);
  const webPort = Number(process.env.WEB_PORT ?? 3000);
  if (await portOpen(apiPort)) throw new Error(`A porta da API ${apiPort} já está ocupada.`);
  if (await portOpen(webPort)) throw new Error(`A porta web ${webPort} já está ocupada.`);
  await ensureDatabase();
  const api = launch(["--filter", "@xingyu/api", "dev"], "api");
  const healthUrl = `http://localhost:${apiPort}/api/health`;
  await Promise.race([
    waitForHealth(healthUrl),
    new Promise((_, reject) =>
      api.once("exit", (code) => reject(new Error(`API encerrou antes do health check (${code}).`))),
    ),
  ]);
  launch(["--filter", "@xingyu/web", "dev"], "web");
  await waitForPort(webPort);
  console.log("\nXingyu CRM pronto:");
  console.log(`  Web:    http://localhost:${webPort}`);
  console.log(`  API:    http://localhost:${apiPort}/api`);
  console.log(`  Swagger: http://localhost:${apiPort}/docs`);
  await new Promise(() => undefined);
}

async function status(doctor = false) {
  ensureEnv();
  const port = Number(process.env.POSTGRES_PORT ?? 5432);
  const initialized = fs.existsSync(path.join(pgData, "PG_VERSION"));
  const open = await portOpen(port);
  console.log(`.env: ${fs.existsSync(envPath) ? "ok" : "ausente"}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "configurada" : "ausente"}`);
  console.log(`cluster: ${initialized ? "inicializado" : "ausente/incompleto"}`);
  console.log(`PG_VERSION: ${initialized ? fs.readFileSync(path.join(pgData, "PG_VERSION"), "utf8").trim() : "ausente"}`);
  console.log(`porta ${port}: ${open ? "aberta" : "fechada"}`);
  if (doctor && open) await run(["--filter", "@xingyu/database", "exec", "prisma", "migrate", "status"], "Prisma migrate status");
  if (doctor && (!initialized || !open)) process.exitCode = 1;
}

const command = process.argv[2];
let shuttingDown = false;
async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await stopChildren();
  process.exit(code);
}
process.once("SIGINT", () => void shutdown(130));
process.once("SIGTERM", () => void shutdown(143));

try {
  if (command === "setup") await setup();
  else if (command === "dev") await dev();
  else if (command === "doctor") await status(true);
  else if (command === "status") await status(false);
  else throw new Error(`Comando local desconhecido: ${command ?? "(ausente)"}`);
  if (command !== "dev") await stopChildren();
} catch (error) {
  console.error(`[local] ${error instanceof Error ? error.message : String(error)}`);
  await stopChildren();
  process.exitCode = 1;
}
