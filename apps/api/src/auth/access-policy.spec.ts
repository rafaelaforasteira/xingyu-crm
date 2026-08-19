import { AuthRole } from "@xingyu/database";
import { accessManifest, can, getScope } from "./access-policy";
describe("access policy", () => {
  it("gives admin full administrative access", () => { expect(can(AuthRole.ADMIN,"users.manage")).toBe(true); expect(getScope(AuthRole.ADMIN,"orders")).toBe("ALL"); });
  it("maps manager to supervisor operational access", () => { expect(can(AuthRole.MANAGER,"pipelines.view")).toBe(true); expect(can(AuthRole.MANAGER,"clients.view")).toBe(false); expect(getScope(AuthRole.MANAGER,"deals")).toBe("ALL"); });
  it("limits consultants to their records", () => { expect(getScope(AuthRole.CONSULTANT,"orders")).toBe("SELF"); expect(can(AuthRole.CONSULTANT,"organization.manage")).toBe(false); });
  it("exposes a frontend-safe manifest", () => expect(accessManifest(AuthRole.CONSULTANT).permissions).toContain("profile.edit"));
});
