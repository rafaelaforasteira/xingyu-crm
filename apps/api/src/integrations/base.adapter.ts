export interface IntegrationResult<T = unknown> {
  ok: boolean;
  mode: "mock" | "live";
  data: T;
  message?: string;
}

export abstract class BaseMockAdapter {
  readonly mode = "mock" as const;

  protected success<T>(data: T, message?: string): IntegrationResult<T> {
    return { ok: true, mode: this.mode, data, message };
  }
}
