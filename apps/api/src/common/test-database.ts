/** Database-backed tests must explicitly opt in to a disposable local database. */
export function configureTestDatabase(env: NodeJS.ProcessEnv = process.env): void {
  const value = env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL must point to an isolated local *_test database");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid TEST_DATABASE_URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^\/[a-zA-Z0-9_]+_test$/.test(url.pathname) ||
    [...url.searchParams.keys()].some((key) => key !== "schema")
  ) {
    throw new Error("TEST_DATABASE_URL must point to an isolated local *_test database");
  }
  env.DATABASE_URL = value;
}
