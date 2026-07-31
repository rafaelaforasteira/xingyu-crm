import { AuthRole } from "@xingyu/database";
import { assertDemoModeAllowed, validateEnvironment } from "../common/env.validation";

describe("DEMO_MODE production guard", () => {
  it("rejects DEMO_MODE=true when NODE_ENV=production", () => {
    expect(() =>
      assertDemoModeAllowed({
        NODE_ENV: "production",
        DEMO_MODE: "true",
      }),
    ).toThrow(/DEMO_MODE=true é proibido/);

    expect(() =>
      validateEnvironment({
        DATABASE_URL: "postgresql://xingyu:xingyu@localhost:5432/xingyu_crm",
        NODE_ENV: "production",
        DEMO_MODE: "true",
        JWT_ACCESS_SECRET: "access-secret-production-value-32",
        JWT_REFRESH_SECRET: "refresh-secret-production-value-32",
      }),
    ).toThrow(/DEMO_MODE=true é proibido/);
  });

  it("allows DEMO_MODE in development", () => {
    const result = validateEnvironment({
      DATABASE_URL: "postgresql://xingyu:xingyu@localhost:5432/xingyu_crm",
      NODE_ENV: "development",
      DEMO_MODE: "true",
      JWT_ACCESS_SECRET: "access-secret-dev-value-32chars",
      JWT_REFRESH_SECRET: "refresh-secret-dev-value-32chars",
    });
    expect(result.DEMO_MODE).toBe("true");
  });

  it("maps AuthRole labels used by JWT payload", () => {
    expect(AuthRole.ADMIN).toBe("ADMIN");
    expect(AuthRole.MANAGER).toBe("MANAGER");
    expect(AuthRole.CONSULTANT).toBe("CONSULTANT");
  });
});
