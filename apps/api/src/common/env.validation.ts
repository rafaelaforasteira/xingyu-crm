import { Logger } from "@nestjs/common";
import { randomBytes } from "node:crypto";

const logger = new Logger("EnvValidation");

export function assertDemoModeAllowed(config: Record<string, unknown>): boolean {
  const demoMode = String(config.DEMO_MODE ?? "false").toLowerCase() === "true";
  const nodeEnv = String(config.NODE_ENV ?? "development").toLowerCase();
  if (demoMode && nodeEnv === "production") {
    throw new Error(
      "DEMO_MODE=true é proibido quando NODE_ENV=production. Desative DEMO_MODE para iniciar a API.",
    );
  }
  return demoMode && (nodeEnv === "development" || nodeEnv === "test");
}

function requireSecret(
  config: Record<string, unknown>,
  name: string,
  nodeEnv: string,
): string {
  const value = typeof config[name] === "string" ? (config[name] as string).trim() : "";
  if (value) return value;

  if (nodeEnv === "production" || nodeEnv === "homologation" || nodeEnv === "staging") {
    throw new Error(
      `${name} é obrigatório neste ambiente. Defina um segredo forte no .env (nunca versionado).`,
    );
  }

  const generated = randomBytes(32).toString("hex");
  logger.warn(
    `${name} não definido — gerando segredo efêmero para desenvolvimento local. Defina no .env para sessões estáveis entre reinícios.`,
  );
  return generated;
}

export function validateEnvironment(config: Record<string, unknown>) {
  if (!config.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não foi definida. Execute pnpm setup:local ou configure o arquivo .env na raiz.",
    );
  }

  for (const name of ["POSTGRES_PORT", "API_PORT", "WEB_PORT"] as const) {
    const value = config[name];
    if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) < 1)) {
      throw new Error(`${name} deve ser uma porta válida.`);
    }
  }

  const nodeEnv = String(config.NODE_ENV ?? "development").toLowerCase();
  const demoAllowed = assertDemoModeAllowed(config);

  const accessSecret = requireSecret(config, "JWT_ACCESS_SECRET", nodeEnv);
  const refreshSecret = requireSecret(config, "JWT_REFRESH_SECRET", nodeEnv);
  if (accessSecret === refreshSecret && nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error(
      "JWT_ACCESS_SECRET e JWT_REFRESH_SECRET devem ser valores distintos.",
    );
  }

  return {
    ...config,
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    JWT_ACCESS_EXPIRES_IN: config.JWT_ACCESS_EXPIRES_IN ?? "15m",
    JWT_REFRESH_EXPIRES_IN: config.JWT_REFRESH_EXPIRES_IN ?? "7d",
    DEMO_MODE: demoAllowed ? "true" : "false",
  };
}
