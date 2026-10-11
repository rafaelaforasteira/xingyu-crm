import { INestApplication, ValidationPipe, UnauthorizedException } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { RecoveryController } from "./recovery.controller";
import { RecoveryService } from "./recovery.service";
import { RECOVERY_DATA_SOURCE } from "./recovery-data-source";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { canAccessCrmApi, canAccessCrmRoute } from "@xingyu/config";
import { checkout, paidOrder } from "./recovery-fixtures";

describe("Recovery HTTP boundary and tenant isolation", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RecoveryController],
      providers: [
        RecoveryService,
        {
          provide: RECOVERY_DATA_SOURCE,
          useValue: {
            load: async (org: string) => ({
              source: "demo",
              provider: "fixture",
              timezone: "America/Sao_Paulo",
              checkouts: [
                checkout(),
                checkout("foreign", undefined, {
                  organizationId: "org-b",
                  customer: { ...checkout().customer, label: "TENANT_B_SECRET" },
                }),
              ],
              orders: [
                paidOrder(),
                paidOrder("foreign", { organizationId: "org-b", checkoutId: "foreign" }),
              ],
            }),
          },
        },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (ctx) => {
              const r = ctx.switchToHttp().getRequest();
              if (!r.headers["x-test-role"]) throw new UnauthorizedException();
              r.user = {
                role: r.headers["x-test-role"],
                organizationId: r.headers["x-test-org"] ?? "org-a",
              };
              r.organizationId = r.user.organizationId;
              return true;
            },
          },
        },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });
  afterAll(() => app.close());
  it("requires authentication and admin role on every endpoint", async () => {
    await request(app.getHttpServer()).get("/api/tracking/recovery/overview").expect(401);
    for (const role of ["MANAGER", "CONSULTANT"]) {
      for (const path of ["overview", "opportunities", "cases/case-1"])
        await request(app.getHttpServer())
          .get("/api/tracking/recovery/" + path)
          .set("x-test-role", role)
          .expect(403);
      expect(canAccessCrmApi(role, "GET", "/api/tracking/recovery/overview")).toBe(false);
      expect(canAccessCrmRoute(role, "/tracking/recuperacao")).toBe(false);
      expect(canAccessCrmRoute(role, "/tracking/vendas")).toBe(true);
    }
  });
  it("returns reconciled admin data without foreign organizations or arbitrary tenant input", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/tracking/recovery/overview?startDate=2026-09-01&endDate=2026-10-10")
      .set("x-test-role", "ADMIN")
      .expect(200);
    expect(response.body.summary.eligibleCases).toBe(1);
    expect(Object.values(response.body.dataQuality.reconciliation).every(Boolean)).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain("TENANT_B_SECRET");
    await request(app.getHttpServer())
      .get("/api/tracking/recovery/overview?organizationId=org-b")
      .set("x-test-role", "ADMIN")
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/tracking/recovery/cases/foreign")
      .set("x-test-role", "ADMIN")
      .expect(404);
  });
  it("validates range, enum, pagination and search inputs", async () => {
    for (const query of [
      "startDate=2026-02-30&endDate=2026-03-01",
      "status=INVALID",
      "page=0",
      "pageSize=500",
      "startDate=2020-01-01&endDate=2026-10-10",
      "startDate=2099-01-01&endDate=2099-01-03",
    ])
      await request(app.getHttpServer())
        .get("/api/tracking/recovery/overview?" + query)
        .set("x-test-role", "ADMIN")
        .expect(400);
  });
  it("paginates and sorts only open cases, never leaks another tenant", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/tracking/recovery/opportunities?pageSize=10&sort=value")
      .set("x-test-role", "ADMIN")
      .expect(200);
    expect(response.body.meta.pageSize).toBe(10);
    expect(response.body.data).toEqual([]);
    const b = await request(app.getHttpServer())
      .get("/api/tracking/recovery/cases/case-1")
      .set("x-test-role", "ADMIN")
      .set("x-test-org", "org-b")
      .expect(404);
    expect(b.body.message).toContain("organização");
  });
});
