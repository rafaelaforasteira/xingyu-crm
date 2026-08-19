import { DEMO_ORG_ID } from "../constants";
import { resolveOrganizationId } from "./organization.decorator";

describe("resolveOrganizationId", () => {
  it("uses the authenticated session organization and ignores query/header spoofing", () => {
    expect(
      resolveOrganizationId({
        user: { organizationId: "org-session" },
        organizationId: "org-middleware",
      }),
    ).toBe("org-session");
  });

  it("falls back to AuthGuard-bound request.organizationId", () => {
    expect(resolveOrganizationId({ organizationId: "org-from-guard" })).toBe(
      "org-from-guard",
    );
  });

  it("does not honor a missing session by inventing a tenant from the client", () => {
    expect(resolveOrganizationId({})).toBe(DEMO_ORG_ID);
  });
});
