export type IntegrationAdapter = {
  name: string;
  isConfigured: () => boolean;
  sync: () => Promise<{ ok: boolean; message: string; logs: string[] }>;
};

export function demoSync(name: string): Promise<{ ok: boolean; message: string; logs: string[] }> {
  const now = new Date().toISOString();
  return Promise.resolve({
    ok: true,
    message: `${name}: sincronização demonstrativa concluída`,
    logs: [`[${now}] DEMO_MODE ativo`, `[${now}] Nenhum segredo externo utilizado`],
  });
}
