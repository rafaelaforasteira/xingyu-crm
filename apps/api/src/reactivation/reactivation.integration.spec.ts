import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { existsSync, readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { ReactivationController } from "./reactivation.controller";
import { ReactivationService } from "./reactivation.service";

jest.setTimeout(30_000);

type HttpContact = {
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  totalPurchased: number;
  averageTicket: number;
  orderCount: number;
};

type HttpReactivationItem = {
  id: string;
  contact: HttpContact | null;
  score: number;
  reason: string;
  status: string;
  classification: string;
  daysInactive: number;
  lastInteractionAt: string | null;
  lastPurchaseAt: string | null;
  owner: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  existingOpenDealId: string | null;
};

type HttpReactivationResponse = {
  data: HttpReactivationItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../packages/database/.env"),
    resolve(process.cwd(), "../../.env.example"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const match = readFileSync(candidate, "utf8").match(/^DATABASE_URL\s*=\s*(.+)$/m);
    if (!match?.[1]) continue;
    process.env.DATABASE_URL = match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
    return;
  }
  throw new Error("DATABASE_URL is required for the reactivation integration test");
}

describe("GET /api/reactivation integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;

  beforeAll(async () => {
    ensureDatabaseUrl();
    prisma = new PrismaService();
    await prisma.$connect();

    const moduleRef = await Test.createTestingModule({
      controllers: [ReactivationController],
      providers: [
        ReactivationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/reactivation`;
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  async function get(query = "") {
    return fetch(`${baseUrl}${query}`, {
      headers: {
        "X-Demo-User-Id": "demo-admin",
        "X-Organization-Id": "org-xingyu",
      },
    });
  }

  async function getJson(query = "") {
    const response = await get(query);
    const body = (await response.json()) as HttpReactivationResponse;
    return { response, body };
  }

  it("returns the documented shape, derived score, open deal, and numeric Decimal fields", async () => {
    const { response, body } = await getJson("?search=Renata&page=1&pageSize=10");

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    expect(body.data).toHaveLength(1);

    const item = body.data[0]!;
    expect(Object.keys(item).sort()).toEqual(
      [
        "id",
        "contact",
        "score",
        "reason",
        "status",
        "classification",
        "daysInactive",
        "lastInteractionAt",
        "lastPurchaseAt",
        "owner",
        "team",
        "existingOpenDealId",
        "existingOpenDeal",
        "latestConversation",
        "workflow",
      ].sort(),
    );
    expect(item).toEqual(
      expect.objectContaining({
        id: "ct-10",
        score: expect.any(Number),
        reason: "Cliente sem resposta",
        status: "INACTIVE",
        classification: "cliente_sem_resposta",
        daysInactive: expect.any(Number),
        lastInteractionAt: expect.any(String),
        lastPurchaseAt: expect.any(String),
        owner: { id: "user-amanda", name: "Amanda Souza" },
        team: { id: "team-comercial", name: "Comercial" },
        existingOpenDealId: "deal-24",
      }),
    );
    expect(item.score).toBeGreaterThanOrEqual(0);
    expect(item.score).toBeLessThanOrEqual(100);
    expect(item.contact).toEqual(
      expect.objectContaining({
        id: "ct-10",
        name: "Renata Silva",
        firstName: "Renata",
        lastName: "Silva",
        totalPurchased: expect.any(Number),
        averageTicket: expect.any(Number),
        orderCount: 10,
      }),
    );
    expect(typeof item.contact?.totalPurchased).toBe("number");
    expect(typeof item.contact?.averageTicket).toBe("number");
  });

  it("filters a segment before count and pagination, including an empty page with global meta", async () => {
    const page1 = await getJson(
      "?segment=lead_nunca_comprou&page=1&pageSize=2&sortBy=name&sortOrder=asc",
    );
    const page2 = await getJson(
      "?segment=lead_nunca_comprou&page=2&pageSize=2&sortBy=name&sortOrder=asc",
    );
    const emptyPage = await getJson(
      "?segment=lead_nunca_comprou&page=999&pageSize=2&sortBy=name&sortOrder=asc",
    );

    expect(page1.response.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta.total).toBeGreaterThan(2);
    expect(page1.body.data.every((item) => item.classification === "lead_nunca_comprou")).toBe(
      true,
    );
    expect(page2.body.meta.total).toBe(page1.body.meta.total);
    expect(page2.body.data).toHaveLength(2);
    expect(page2.body.data.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(page1.body.data.map((item) => item.id)),
    );
    expect(emptyPage.body.data).toEqual([]);
    expect(emptyPage.body.meta).toEqual({
      total: page1.body.meta.total,
      page: 999,
      pageSize: 2,
      totalPages: Math.ceil(page1.body.meta.total / 2),
    });
  });

  it("applies score, inactivity, status, owner, team, and date filters to real data", async () => {
    const baseline = await getJson("?search=Renata&pageSize=10");
    const item = baseline.body.data[0]!;
    const lastPurchaseAt = new Date(item.lastPurchaseAt!);
    const lastInteractionAt = new Date(item.lastInteractionAt!);
    const filters = {
      scoreMin: String(item.score),
      scoreMax: String(item.score),
      inactiveDaysMin: String(item.daysInactive),
      inactiveDaysMax: String(item.daysInactive),
      status: item.status,
      ownerId: item.owner!.id,
      teamId: item.team!.id,
      lastPurchaseFrom: new Date(lastPurchaseAt.getTime() - 1_000).toISOString(),
      lastPurchaseTo: new Date(lastPurchaseAt.getTime() + 1_000).toISOString(),
      lastInteractionFrom: new Date(lastInteractionAt.getTime() - 1_000).toISOString(),
      lastInteractionTo: new Date(lastInteractionAt.getTime() + 1_000).toISOString(),
      sortBy: "lastInteractionAt",
      sortOrder: "desc",
    };

    for (const [field, value] of Object.entries(filters)) {
      if (field === "sortBy" || field === "sortOrder") continue;
      const singleFilter = new URLSearchParams({ search: "Renata", [field]: value });
      const result = await getJson(`?${singleFilter.toString()}`);
      if (result.body.meta.total !== 1) {
        throw new Error(
          `Filter ${field}=${value} unexpectedly returned ${result.body.meta.total} rows`,
        );
      }
    }

    const query = new URLSearchParams({ search: "Renata", ...filters });
    const filtered = await getJson(`?${query.toString()}`);

    expect(filtered.response.status).toBe(200);
    expect(filtered.body.meta.total).toBe(1);
    expect(filtered.body.data[0]?.id).toBe("ct-10");
  });

  it("keeps nullable purchase dates explicit for never-purchased contacts", async () => {
    const { response, body } = await getJson(
      "?segment=lead_nunca_comprou&page=1&pageSize=100&sortBy=name&sortOrder=desc",
    );

    expect(response.status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((item) => item.lastPurchaseAt === null)).toBe(true);
    expect(body.data.every((item) => Number.isInteger(item.daysInactive))).toBe(true);
    expect(body.data.every((item) => item.daysInactive >= 0)).toBe(true);
  });

  it.each([
    "?segment=invalid-segment",
    "?status=INVALID",
    "?status=ARCHIVED",
    "?sortBy=unknown",
    "?sortOrder=sideways",
    "?scoreMin=101",
    "?lastPurchaseFrom=not-a-date",
    "?scoreMin=90&scoreMax=10",
    "?inactiveDaysMin=90&inactiveDaysMax=10",
    "?lastInteractionFrom=2026-07-30T00%3A00%3A00.000Z&lastInteractionTo=2026-01-01T00%3A00%3A00.000Z",
  ])("returns HTTP 400 for an invalid query: %s", async (query) => {
    const response = await get(query);
    expect(response.status).toBe(400);
  });

  it("returns the same deterministic order on repeated ascending and descending requests", async () => {
    for (const order of ["asc", "desc"] as const) {
      const query = `?page=1&pageSize=10&sortBy=score&sortOrder=${order}`;
      const first = await getJson(query);
      const second = await getJson(query);

      expect(first.response.status).toBe(200);
      expect(second.response.status).toBe(200);
      expect(second.body.data.map((item) => item.id)).toEqual(
        first.body.data.map((item) => item.id),
      );
    }
  });
});
