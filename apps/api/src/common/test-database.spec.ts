import { configureTestDatabase } from "./test-database";

describe("isolated integration database", () => {
  it.each([
    undefined,
    "invalid",
    "postgresql://user:password@production.example/crm_test",
    "postgresql://user:password@localhost/xingyu_crm",
    "postgresql://user:password@localhost/crm_test?host=production.example",
    "https://localhost/crm_test",
  ])("rejects unsafe or missing test configuration without fallback", (value) => {
    const env = { TEST_DATABASE_URL: value, DATABASE_URL: "existing-value" };
    expect(() => configureTestDatabase(env)).toThrow();
    expect(env.DATABASE_URL).toBe("existing-value");
  });

  it("overrides inherited database configuration only with an explicit local test target", () => {
    const env = {
      TEST_DATABASE_URL: "postgresql://test:test@127.0.0.1:55439/brainx_test?schema=public",
      DATABASE_URL: "existing-value",
    };
    configureTestDatabase(env);
    expect(env.DATABASE_URL).toBe(env.TEST_DATABASE_URL);
  });
});
