import { BadRequestException } from "@nestjs/common";
import { ContactStatus, Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  QueryReactivationDto,
  ReactivationCandidateStatus,
  ReactivationSegment,
  ReactivationSortBy,
} from "./dto/reactivation.dto";
import { ReactivationService } from "./reactivation.service";

type QueryRawMock = jest.Mock<Promise<unknown[]>, [Prisma.Sql]>;

type PrismaMock = {
  $queryRaw: QueryRawMock;
};

function sentinel(totalCount: number | bigint = 0) {
  return {
    id: null,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    totalPurchased: null,
    averageTicket: null,
    orderCount: null,
    status: null,
    classification: null,
    score: null,
    daysInactive: null,
    lastInteractionAt: null,
    lastPurchaseAt: null,
    ownerId: null,
    ownerName: null,
    teamId: null,
    teamName: null,
    existingOpenDealId: null,
    totalCount,
  };
}

function row(
  overrides: Partial<ReturnType<typeof sentinel>> & {
    id?: string;
    firstName?: string;
  } = {},
) {
  return {
    ...sentinel(1),
    id: "contact-1",
    firstName: "Renata",
    lastName: "Silva",
    email: "renata@example.com",
    phone: "+5511999990000",
    whatsapp: "+5511999990000",
    instagram: "@renata",
    totalPurchased: new Prisma.Decimal("18750.25"),
    averageTicket: new Prisma.Decimal("1875.50"),
    orderCount: 10,
    status: ContactStatus.INACTIVE,
    classification: ReactivationSegment.UNRESPONSIVE_CUSTOMER,
    score: 84,
    daysInactive: 90,
    lastInteractionAt: new Date("2026-07-26T12:00:00.000Z"),
    lastPurchaseAt: new Date("2026-05-01T12:00:00.000Z"),
    ownerId: "owner-1",
    ownerName: "Amanda Souza",
    teamId: "team-1",
    teamName: "Comercial",
    existingOpenDealId: "deal-open-1",
    ...overrides,
  };
}

describe("ReactivationService", () => {
  let prisma: PrismaMock;
  let service: ReactivationService;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn() };
    service = new ReactivationService(prisma as unknown as PrismaService);
  });

  it("returns the exact stable projection and converts Prisma Decimal values to numbers", async () => {
    prisma.$queryRaw.mockResolvedValue([row()]);

    await expect(service.list("org-test", new QueryReactivationDto())).resolves.toEqual({
      data: [
        {
          id: "contact-1",
          contact: {
            id: "contact-1",
            name: "Renata Silva",
            firstName: "Renata",
            lastName: "Silva",
            email: "renata@example.com",
            phone: "+5511999990000",
            whatsapp: "+5511999990000",
            instagram: "@renata",
            totalPurchased: 18750.25,
            averageTicket: 1875.5,
            orderCount: 10,
          },
          score: 84,
          reason: "Cliente sem resposta",
          status: ContactStatus.INACTIVE,
          classification: ReactivationSegment.UNRESPONSIVE_CUSTOMER,
          daysInactive: 90,
          lastInteractionAt: "2026-07-26T12:00:00.000Z",
          lastPurchaseAt: "2026-05-01T12:00:00.000Z",
          owner: { id: "owner-1", name: "Amanda Souza" },
          team: { id: "team-1", name: "Comercial" },
          existingOpenDealId: "deal-open-1",
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });
  });

  it("preserves explicit null dates and relations and accepts score boundaries", async () => {
    prisma.$queryRaw.mockResolvedValue([
      row({
        id: "contact-low",
        firstName: "Sem",
        lastName: null,
        score: 0,
        daysInactive: 0,
        lastInteractionAt: null,
        lastPurchaseAt: null,
        ownerId: null,
        ownerName: null,
        teamId: null,
        teamName: null,
        existingOpenDealId: null,
        totalCount: 2,
      }),
      row({
        id: "contact-high",
        firstName: "Máxima",
        score: 100,
        totalCount: 2,
      }),
    ]);

    const result = await service.list("org-test", new QueryReactivationDto());

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: "contact-low",
        score: 0,
        daysInactive: 0,
        lastInteractionAt: null,
        lastPurchaseAt: null,
        owner: null,
        team: null,
        existingOpenDealId: null,
      }),
    );
    expect(result.data[0]?.contact?.name).toBe("Sem");
    expect(result.data[1]?.score).toBe(100);
  });

  it("keeps the global count when an out-of-range page has no rows", async () => {
    prisma.$queryRaw.mockResolvedValue([sentinel(41n)]);

    const result = await service.list("org-test", {
      page: 99,
      pageSize: 2,
    });

    expect(result).toEqual({
      data: [],
      meta: {
        total: 41,
        page: 99,
        pageSize: 2,
        totalPages: 21,
      },
    });
  });

  it("puts every filter in the database query before pagination and honors ascending sort", async () => {
    prisma.$queryRaw.mockResolvedValue([sentinel()]);

    await service.list("org-test", {
      page: 2,
      pageSize: 5,
      search: "Renata",
      scoreMin: 10,
      scoreMax: 90,
      inactiveDaysMin: 30,
      inactiveDaysMax: 180,
      status: ReactivationCandidateStatus.INACTIVE,
      ownerId: "owner-1",
      teamId: "team-1",
      lastPurchaseFrom: "2026-01-01T00:00:00.000Z",
      lastPurchaseTo: "2026-07-01T00:00:00.000Z",
      lastInteractionFrom: "2026-06-01T00:00:00.000Z",
      lastInteractionTo: "2026-07-30T00:00:00.000Z",
      segment: ReactivationSegment.UNRESPONSIVE_CUSTOMER,
      sortBy: ReactivationSortBy.DAYS_INACTIVE,
      sortOrder: "asc",
    });

    const sql = prisma.$queryRaw.mock.calls[0]?.[0] as Prisma.Sql;
    expect(sql.sql).toContain('scored."score" >=');
    expect(sql.sql).toContain('scored."daysInactive" <=');
    expect(sql.sql).toContain('scored."lastInteractionAt" >=');
    expect(sql.sql).toContain('COUNT(*)::integer AS "totalCount"');
    expect(sql.sql).toContain(
      'ORDER BY filtered."daysInactive" ASC NULLS LAST, filtered."id" ASC',
    );
    expect(sql.sql.indexOf('WHERE scored."score"')).toBeLessThan(sql.sql.indexOf("OFFSET"));
    expect(sql.values).toEqual(
      expect.arrayContaining([
        "org-test",
        "%Renata%",
        ContactStatus.INACTIVE,
        "owner-1",
        "team-1",
        10,
        90,
        30,
        180,
        ReactivationSegment.UNRESPONSIVE_CUSTOMER,
        5,
        5,
      ]),
    );
  });

  it("uses descending score with id as the deterministic default order", async () => {
    prisma.$queryRaw.mockResolvedValue([sentinel()]);

    await service.list("org-test", {});

    const sql = prisma.$queryRaw.mock.calls[0]?.[0] as Prisma.Sql;
    expect(sql.sql).toContain(
      'ORDER BY filtered."score" DESC NULLS LAST, filtered."id" ASC',
    );
  });

  it.each([
    [{ scoreMin: 80, scoreMax: 20 }, "scoreMin must be less than or equal to scoreMax"],
    [
      { inactiveDaysMin: 120, inactiveDaysMax: 30 },
      "inactiveDaysMin must be less than or equal to inactiveDaysMax",
    ],
    [
      {
        lastPurchaseFrom: "2026-07-30T00:00:00.000Z",
        lastPurchaseTo: "2026-01-01T00:00:00.000Z",
      },
      "lastPurchaseFrom must be less than or equal to lastPurchaseTo",
    ],
    [
      {
        lastInteractionFrom: "2026-07-30T00:00:00.000Z",
        lastInteractionTo: "2026-01-01T00:00:00.000Z",
      },
      "lastInteractionFrom must be less than or equal to lastInteractionTo",
    ],
  ])("rejects inverted ranges before querying the database", async (query, message) => {
    await expect(service.list("org-test", query as QueryReactivationDto)).rejects.toEqual(
      new BadRequestException(message),
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("rejects invalid dates in direct service calls", async () => {
    await expect(
      service.list("org-test", {
        lastInteractionFrom: "not-a-date",
      }),
    ).rejects.toEqual(
      new BadRequestException("lastInteractionFrom must be a valid ISO 8601 date"),
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
