import { Injectable } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { QueryRepurchaseDto } from "./dto/repurchase.dto";
import { fullName, toNumber } from "../common/mappers";

type NumericValue = number | string | bigint | Prisma.Decimal;

type RawRepurchaseRow = {
  id: string | null;
  contactId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  sourceDealId: string | null;
  sourceOrderId: string | null;
  lastOrderAt: Date | string | null;
  lastPurchaseAt: Date | string | null;
  daysSinceOrder: number | null;
  orderCount: number | null;
  totalPurchased: NumericValue | null;
  averageTicket: NumericValue | null;
  predictedValue: NumericValue | null;
  score: number | null;
  reason: string | null;
  status: string | null;
  ownerId: string | null;
  ownerName: string | null;
  teamId: string | null;
  teamName: string | null;
  totalCount: NumericValue;
};

/**
 * Score (0–100) for repurchase opportunities.
 * - Recency of last order (up to 40)
 * - Historical value / average ticket (up to 30)
 * - Order frequency (up to 20)
 * - Inactivity sweet-spot 60–180 days (up to 10)
 */
export function computeRepurchaseScore(input: {
  daysSinceOrder: number;
  orderCount: number;
  totalPurchased: number;
  averageTicket: number;
}): { score: number; reason: string; predictedValue: number } {
  const { daysSinceOrder, orderCount, totalPurchased, averageTicket } = input;

  let recency = 0;
  if (daysSinceOrder >= 45 && daysSinceOrder <= 120) recency = 40;
  else if (daysSinceOrder > 120 && daysSinceOrder <= 180) recency = 30;
  else if (daysSinceOrder > 180 && daysSinceOrder <= 270) recency = 20;
  else if (daysSinceOrder > 270) recency = 10;
  else recency = 5;

  const valueScore = Math.min(30, Math.floor(Math.log10(Math.max(totalPurchased, 1) + 1) * 10));
  const frequency = Math.min(20, orderCount * 4);
  const sweetSpot =
    daysSinceOrder >= 60 && daysSinceOrder <= 180 ? 10 : daysSinceOrder > 180 ? 5 : 2;

  const score = Math.min(100, Math.round(recency + valueScore + frequency + sweetSpot));
  const predictedValue = Math.round((averageTicket || totalPurchased / Math.max(orderCount, 1)) * 100) / 100;

  let reason = "Cliente elegível para recompra";
  if (orderCount >= 3 && daysSinceOrder >= 60) {
    reason = "Cliente recorrente sem pedido recente";
  } else if (orderCount === 1 && daysSinceOrder >= 45) {
    reason = "Primeira compra antiga — janela de recompra";
  } else if (averageTicket >= 500) {
    reason = "Ticket médio alto com ciclo de recompra aberto";
  }

  return { score, reason, predictedValue };
}

@Injectable()
export class RepurchaseService {
  constructor(private readonly prisma: PrismaService) {}

  async listRepurchaseOpportunities(organizationId: string, query: QueryRepurchaseDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip } = paginationArgs(page, pageSize);
    const days = query.daysSincePurchase ?? 45;
    const ownerFilter = query.ownerId
      ? Prisma.sql`AND c."ownerId" = ${query.ownerId}`
      : Prisma.empty;
    const searchFilter = query.search
      ? Prisma.sql`AND (
          c."firstName" ILIKE ${"%" + query.search + "%"}
          OR c."lastName" ILIKE ${"%" + query.search + "%"}
          OR c."email" ILIKE ${"%" + query.search + "%"}
        )`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawRepurchaseRow[]>(Prisma.sql`
      WITH candidates AS (
        SELECT
          c.id AS "contactId",
          c."firstName",
          c."lastName",
          c.email,
          c.phone,
          c.whatsapp,
          c."ownerId",
          u.name AS "ownerName",
          c."teamId",
          t.name AS "teamName",
          c.status,
          c."orderCount",
          c."totalPurchased",
          c."averageTicket",
          c."lastPurchaseAt",
          (
            SELECT o.id
            FROM "Order" o
            WHERE o."contactId" = c.id
              AND o."organizationId" = ${organizationId}
              AND o."deletedAt" IS NULL
            ORDER BY o."orderedAt" DESC NULLS LAST, o."createdAt" DESC
            LIMIT 1
          ) AS "sourceOrderId",
          (
            SELECT d.id
            FROM "Deal" d
            WHERE d."contactId" = c.id
              AND d."organizationId" = ${organizationId}
              AND d.status = 'WON'
              AND d."deletedAt" IS NULL
            ORDER BY d."closedAt" DESC NULLS LAST
            LIMIT 1
          ) AS "sourceDealId",
          COALESCE(c."lastPurchaseAt", (
            SELECT MAX(o."orderedAt")
            FROM "Order" o
            WHERE o."contactId" = c.id AND o."organizationId" = ${organizationId} AND o."deletedAt" IS NULL
          )) AS "lastOrderAt",
          GREATEST(
            0,
            FLOOR(
              EXTRACT(
                EPOCH FROM (
                  NOW() - COALESCE(
                    c."lastPurchaseAt",
                    (
                      SELECT MAX(o."orderedAt")
                      FROM "Order" o
                      WHERE o."contactId" = c.id
                        AND o."organizationId" = ${organizationId}
                        AND o."deletedAt" IS NULL
                    )
                  )
                )
              ) / 86400
            )
          )::int AS "daysSinceOrder"
        FROM "Contact" c
        LEFT JOIN "User" u ON u.id = c."ownerId"
        LEFT JOIN "Team" t ON t.id = c."teamId"
        WHERE c."organizationId" = ${organizationId}
          AND c."deletedAt" IS NULL
          AND c.status <> 'ARCHIVED'
          AND c."orderCount" > 0
          AND COALESCE(c."lastPurchaseAt", (
            SELECT MAX(o."orderedAt")
            FROM "Order" o
            WHERE o."contactId" = c.id AND o."organizationId" = ${organizationId} AND o."deletedAt" IS NULL
          )) IS NOT NULL
          AND COALESCE(c."lastPurchaseAt", (
            SELECT MAX(o."orderedAt")
            FROM "Order" o
            WHERE o."contactId" = c.id AND o."organizationId" = ${organizationId} AND o."deletedAt" IS NULL
          )) <= (NOW() - (${days}::text || ' days')::interval)
          ${ownerFilter}
          ${searchFilter}
      ),
      scored AS (
        SELECT
          candidates.*,
          CASE
            WHEN candidates."daysSinceOrder" BETWEEN 45 AND 120 THEN 40
            WHEN candidates."daysSinceOrder" BETWEEN 121 AND 180 THEN 30
            WHEN candidates."daysSinceOrder" BETWEEN 181 AND 270 THEN 20
            WHEN candidates."daysSinceOrder" > 270 THEN 10
            ELSE 5
          END
          + LEAST(30, FLOOR(LN(GREATEST(candidates."totalPurchased"::float, 1) + 1) * 10))
          + LEAST(20, candidates."orderCount" * 4)
          + CASE
              WHEN candidates."daysSinceOrder" BETWEEN 60 AND 180 THEN 10
              WHEN candidates."daysSinceOrder" > 180 THEN 5
              ELSE 2
            END AS score,
          CASE
            WHEN candidates."orderCount" >= 3 AND candidates."daysSinceOrder" >= 60
              THEN 'Cliente recorrente sem pedido recente'
            WHEN candidates."orderCount" = 1 AND candidates."daysSinceOrder" >= 45
              THEN 'Primeira compra antiga — janela de recompra'
            WHEN candidates."averageTicket" >= 500
              THEN 'Ticket médio alto com ciclo de recompra aberto'
            ELSE 'Cliente elegível para recompra'
          END AS reason,
          ROUND(
            COALESCE(
              NULLIF(candidates."averageTicket"::float, 0),
              candidates."totalPurchased"::float / GREATEST(candidates."orderCount", 1)
            )::numeric,
            2
          ) AS "predictedValue"
        FROM candidates
      ),
      totals AS (
        SELECT COUNT(*)::int AS "totalCount" FROM scored
      )
      SELECT
        scored."contactId" AS id,
        scored."contactId",
        scored."firstName",
        scored."lastName",
        scored.email,
        scored.phone,
        scored.whatsapp,
        scored."sourceDealId",
        scored."sourceOrderId",
        scored."lastOrderAt",
        scored."lastPurchaseAt",
        scored."daysSinceOrder",
        scored."orderCount",
        scored."totalPurchased",
        scored."averageTicket",
        scored."predictedValue",
        LEAST(100, scored.score)::int AS score,
        scored.reason,
        scored.status,
        scored."ownerId",
        scored."ownerName",
        scored."teamId",
        scored."teamName",
        totals."totalCount"
      FROM totals
      LEFT JOIN LATERAL (
        SELECT *
        FROM scored
        ORDER BY scored.score DESC, scored."daysSinceOrder" DESC, scored."contactId" ASC
        OFFSET ${skip}
        LIMIT ${pageSize}
      ) AS scored ON TRUE
    `);

    const total = rows[0] ? Math.max(0, Math.trunc(toNumber(rows[0].totalCount))) : 0;
    const data = rows
      .filter((row): row is RawRepurchaseRow & { id: string; contactId: string } =>
        typeof row.id === "string" && typeof row.contactId === "string",
      )
      .map((row) => {
        const name = fullName(row.firstName, row.lastName);
        return {
          id: row.id,
          contactId: row.contactId,
          contact: {
            id: row.contactId,
            firstName: row.firstName ?? "",
            lastName: row.lastName,
            name,
            email: row.email,
            phone: row.phone,
            whatsapp: row.whatsapp,
          },
          sourceDealId: row.sourceDealId,
          sourceOrderId: row.sourceOrderId,
          score: row.score ?? 0,
          reason: row.reason ?? "Cliente elegível para recompra",
          daysSinceOrder: row.daysSinceOrder ?? 0,
          lastOrderAt: row.lastOrderAt
            ? new Date(row.lastOrderAt).toISOString()
            : null,
          lastPurchaseAt: row.lastPurchaseAt
            ? new Date(row.lastPurchaseAt).toISOString()
            : null,
          predictedValue: toNumber(row.predictedValue),
          totalPurchased: toNumber(row.totalPurchased),
          averageTicket: toNumber(row.averageTicket),
          orderCount: row.orderCount ?? 0,
          status: row.status ?? "ACTIVE_CUSTOMER",
          owner:
            row.ownerId && row.ownerName
              ? { id: row.ownerId, name: row.ownerName }
              : null,
          team:
            row.teamId && row.teamName
              ? { id: row.teamId, name: row.teamName }
              : null,
        };
      });

    return paginate(data, total, page, pageSize);
  }
}
