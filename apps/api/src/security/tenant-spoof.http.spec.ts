import { Controller, Get, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { OrganizationId, resolveOrganizationId } from "../common/decorators/organization.decorator";

@Controller("tenant-probe")
class TenantProbeController {
  @Get()
  probe(@OrganizationId() organizationId: string) {
    return { organizationId };
  }
}

describe("organizationId spoofing over HTTP", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use((req: { user?: { organizationId: string }; organizationId?: string }, _res, next) => {
      req.user = { organizationId: "org-a" };
      req.organizationId = "org-a";
      next();
    });
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("ignores query and header tenant overrides", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/tenant-probe")
      .query({ organizationId: "org-b" })
      .set("X-Organization-Id", "org-b")
      .expect(200);

    expect(res.body.organizationId).toBe("org-a");
  });

  it("resolveOrganizationId never prefers a client-supplied org", () => {
    expect(
      resolveOrganizationId({
        user: { organizationId: "org-session" },
        organizationId: "org-injected",
      }),
    ).toBe("org-session");
  });
});
