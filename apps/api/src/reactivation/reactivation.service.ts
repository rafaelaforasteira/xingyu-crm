import { BadRequestException, Injectable } from "@nestjs/common";
import { ContactStatus, Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import {
  QueryReactivationDto,
  ReactivationItemDto,
  ReactivationSegment,
  ReactivationSortBy,
} from "./dto/reactivation.dto";

type NumericValue = number | string | bigint | Prisma.Decimal;

type RawReactivationRow = {
  id: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  totalPurchased: NumericValue | null;
  averageTicket: NumericValue | null;
  orderCount: number | null;
  status: ContactStatus | null;
  classification: ReactivationSegment | null;
  score: number | null;
  daysInactive: number | null;
  lastInteractionAt: Date | string | null;
  lastPurchaseAt: Date | string | null;
  ownerId: string | null;
  ownerName: string | null;
  teamId: string | null;
  teamName: string | null;
  existingOpenDealId: string | null;
  totalCount: NumericValue;
};

type CandidateRow = RawReactivationRow & {
  id: string;
  firstName: string;
  orderCount: number;
  status: ContactStatus;
  classification: ReactivationSegment;
  score: number;
  daysInactive: number;
};

const REACTIVATION_REASONS: Record<ReactivationSegment, string> = {
  [ReactivationSegment.NEVER_PURCHASED]: "Lead nunca comprou",
  [ReactivationSegment.PURCHASED_ONCE]: "Comprou uma vez e está inativo",
  [ReactivationSegment.LAPSED_REPEAT_CUSTOMER]: "Cliente recorrente parou de comprar",
  [ReactivationSegment.UNRESPONSIVE_CUSTOMER]: "Cliente sem resposta",
};

function isCandidateRow(row: RawReactivationRow): row is CandidateRow {
  return (
    typeof row.id === "string" &&
    typeof row.firstName === "string" &&
    typeof row.orderCount === "number" &&
    typeof row.status === "string" &&
    typeof row.classification === "string" &&
    typeof row.score === "number" &&
    typeof row.daysInactive === "number"
  );
}

function numericValue(value: NumericValue | null, fallback = 0): number {
  if (value === null) return fallback;
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function isoDate(value: Date | string | null): string | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseFilterDate(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO 8601 date`);
  }
  return date;
}

function validateNumericRange(
  minimum: number | undefined,
  maximum: number | undefined,
  minimumField: string,
  maximumField: string,
) {
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new BadRequestException(`${minimumField} must be less than or equal to ${maximumField}`);
  }
}

function validateDateRange(
  from: Date | undefined,
  to: Date | undefined,
  fromField: string,
  toField: string,
) {
  if (from && to && from.getTime() > to.getTime()) {
    throw new BadRequestException(`${fromField} must be less than or equal to ${toField}`);
  }
}

function sortColumn(sortBy: ReactivationSortBy): Prisma.Sql {
  switch (sortBy) {
    case ReactivationSortBy.DAYS_INACTIVE:
      return Prisma.sql`filtered."daysInactive"`;
    case ReactivationSortBy.LAST_PURCHASE_AT:
      return Prisma.sql`filtered."lastPurchaseAt"`;
    case ReactivationSortBy.LAST_INTERACTION_AT:
      return Prisma.sql`filtered."lastInteractionAt"`;
    case ReactivationSortBy.NAME:
      return Prisma.sql`LOWER(CONCAT_WS(' ', filtered."firstName", filtered."lastName"))`;
    case ReactivationSortBy.SCORE:
    default:
      return Prisma.sql`filtered."score"`;
  }
}

@Injectable()
export class ReactivationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: QueryReactivationDto) {
    validateNumericRange(query.scoreMin, query.scoreMax, "scoreMin", "scoreMax");
    validateNumericRange(
      query.inactiveDaysMin,
      query.inactiveDaysMax,
      "inactiveDaysMin",
      "inactiveDaysMax",
    );

    const lastPurchaseFrom = parseFilterDate(query.lastPurchaseFrom, "lastPurchaseFrom");
    const lastPurchaseTo = parseFilterDate(query.lastPurchaseTo, "lastPurchaseTo");
    const lastInteractionFrom = parseFilterDate(
      query.lastInteractionFrom,
      "lastInteractionFrom",
    );
    const lastInteractionTo = parseFilterDate(query.lastInteractionTo, "lastInteractionTo");
    validateDateRange(
      lastPurchaseFrom,
      lastPurchaseTo,
      "lastPurchaseFrom",
      "lastPurchaseTo",
    );
    validateDateRange(
      lastInteractionFrom,
      lastInteractionTo,
      "lastInteractionFrom",
      "lastInteractionTo",
    );

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip } = paginationArgs(page, pageSize);
    const asOf = new Date();
    const inactivePurchaseCutoff = new Date(asOf.getTime() - 120 * 86_400_000);

    const baseFilters: Prisma.Sql[] = [
      Prisma.sql`contact."organizationId" = ${organizationId}`,
      Prisma.sql`contact."deletedAt" IS NULL`,
      Prisma.sql`contact."status" <> 'ARCHIVED'`,
      Prisma.sql`(
        contact."status" = 'INACTIVE'
        OR contact."orderCount" = 0
        OR contact."lastPurchaseAt" <= (
          ${inactivePurchaseCutoff}::timestamptz AT TIME ZONE 'UTC'
        )
        OR (
          contact."lastPurchaseAt" IS NULL
          AND contact."daysWithoutPurchase" > 120
        )
      )`,
    ];

    if (query.search) {
      const search = `%${query.search.trim()}%`;
      baseFilters.push(Prisma.sql`(
        contact."firstName" ILIKE ${search}
        OR contact."lastName" ILIKE ${search}
        OR CONCAT_WS(' ', contact."firstName", contact."lastName") ILIKE ${search}
        OR contact."email" ILIKE ${search}
        OR contact."phone" ILIKE ${search}
        OR contact."whatsapp" ILIKE ${search}
        OR contact."instagram" ILIKE ${search}
      )`);
    }
    if (query.status) {
      baseFilters.push(Prisma.sql`contact."status"::text = ${query.status}`);
    }
    if (query.ownerId) {
      baseFilters.push(Prisma.sql`contact."ownerId" = ${query.ownerId}`);
    }
    if (query.teamId) {
      baseFilters.push(Prisma.sql`contact."teamId" = ${query.teamId}`);
    }
    if (lastPurchaseFrom) {
      baseFilters.push(Prisma.sql`
        contact."lastPurchaseAt" >= (${lastPurchaseFrom}::timestamptz AT TIME ZONE 'UTC')
      `);
    }
    if (lastPurchaseTo) {
      baseFilters.push(Prisma.sql`
        contact."lastPurchaseAt" <= (${lastPurchaseTo}::timestamptz AT TIME ZONE 'UTC')
      `);
    }

    const derivedFilters: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.scoreMin !== undefined) {
      derivedFilters.push(Prisma.sql`scored."score" >= ${query.scoreMin}`);
    }
    if (query.scoreMax !== undefined) {
      derivedFilters.push(Prisma.sql`scored."score" <= ${query.scoreMax}`);
    }
    if (query.inactiveDaysMin !== undefined) {
      derivedFilters.push(
        Prisma.sql`scored."daysInactive" >= ${query.inactiveDaysMin}`,
      );
    }
    if (query.inactiveDaysMax !== undefined) {
      derivedFilters.push(
        Prisma.sql`scored."daysInactive" <= ${query.inactiveDaysMax}`,
      );
    }
    if (query.segment) {
      derivedFilters.push(Prisma.sql`scored."classification" = ${query.segment}`);
    }
    if (lastInteractionFrom) {
      derivedFilters.push(
        Prisma.sql`
          scored."lastInteractionAt" >= (
            ${lastInteractionFrom}::timestamptz AT TIME ZONE 'UTC'
          )
        `,
      );
    }
    if (lastInteractionTo) {
      derivedFilters.push(
        Prisma.sql`
          scored."lastInteractionAt" <= (
            ${lastInteractionTo}::timestamptz AT TIME ZONE 'UTC'
          )
        `,
      );
    }

    const requestedSort = query.sortBy ?? ReactivationSortBy.SCORE;
    const requestedOrder = query.sortOrder ?? "desc";
    const direction = requestedOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const orderColumn = sortColumn(requestedSort);

    const rows = await this.prisma.$queryRaw<RawReactivationRow[]>(Prisma.sql`
      WITH base AS (
        SELECT
          contact."id",
          contact."firstName",
          contact."lastName",
          contact."email",
          contact."phone",
          contact."whatsapp",
          contact."instagram",
          contact."totalPurchased",
          contact."averageTicket",
          contact."orderCount",
          contact."daysWithoutPurchase",
          contact."status",
          contact."lastPurchaseAt",
          contact."createdAt",
          owner."id" AS "ownerId",
          owner."name" AS "ownerName",
          team."id" AS "teamId",
          team."name" AS "teamName",
          GREATEST(
            contact."firstInteractionAt",
            (
              SELECT MAX(activity."createdAt")
              FROM "Activity" AS activity
              WHERE activity."organizationId" = contact."organizationId"
                AND activity."contactId" = contact."id"
            ),
            (
              SELECT MAX(conversation."lastMessageAt")
              FROM "Conversation" AS conversation
              WHERE conversation."organizationId" = contact."organizationId"
                AND conversation."contactId" = contact."id"
                AND conversation."deletedAt" IS NULL
            ),
            (
              SELECT MAX(interaction_deal."lastInteractionAt")
              FROM "Deal" AS interaction_deal
              WHERE interaction_deal."organizationId" = contact."organizationId"
                AND interaction_deal."contactId" = contact."id"
                AND interaction_deal."deletedAt" IS NULL
            )
          ) AS "lastInteractionAt",
          (
            SELECT open_deal."id"
            FROM "Deal" AS open_deal
            WHERE open_deal."organizationId" = contact."organizationId"
              AND open_deal."contactId" = contact."id"
              AND open_deal."status" = 'OPEN'
              AND open_deal."deletedAt" IS NULL
            ORDER BY open_deal."createdAt" DESC, open_deal."id" ASC
            LIMIT 1
          ) AS "existingOpenDealId"
        FROM "Contact" AS contact
        LEFT JOIN "User" AS owner
          ON owner."id" = contact."ownerId"
          AND owner."organizationId" = contact."organizationId"
          AND owner."deletedAt" IS NULL
        LEFT JOIN "Team" AS team
          ON team."id" = contact."teamId"
          AND team."organizationId" = contact."organizationId"
          AND team."deletedAt" IS NULL
        WHERE ${Prisma.join(baseFilters, " AND ")}
      ),
      aged AS (
        SELECT
          base.*,
          GREATEST(
            0,
            COALESCE(
              FLOOR(
                EXTRACT(
                  EPOCH FROM (
                    (${asOf}::timestamptz AT TIME ZONE 'UTC') - COALESCE(
                      base."lastPurchaseAt",
                      base."lastInteractionAt",
                      base."createdAt"
                    )
                  )
                ) / 86400
              )::integer,
              base."daysWithoutPurchase",
              0
            )
          )::integer AS "daysInactive"
        FROM base
      ),
      derived AS (
        SELECT
          aged.*,
          CASE
            WHEN aged."orderCount" = 0
              THEN ${ReactivationSegment.NEVER_PURCHASED}
            WHEN aged."orderCount" = 1
              THEN ${ReactivationSegment.PURCHASED_ONCE}
            WHEN aged."daysInactive" > 180
              THEN ${ReactivationSegment.LAPSED_REPEAT_CUSTOMER}
            ELSE ${ReactivationSegment.UNRESPONSIVE_CUSTOMER}
          END AS "classification"
        FROM aged
      ),
      scored AS (
        SELECT
          derived.*,
          GREATEST(
            0,
            LEAST(
              100,
              CASE
                WHEN derived."daysInactive" <= 30 THEN 40
                WHEN derived."daysInactive" <= 60 THEN 32
                WHEN derived."daysInactive" <= 90 THEN 24
                WHEN derived."daysInactive" <= 120 THEN 16
                WHEN derived."daysInactive" <= 180 THEN 8
                ELSE 4
              END
              + LEAST(30, derived."orderCount" * 6)
              + LEAST(
                30,
                FLOOR(derived."totalPurchased" / 500)::integer
                + FLOOR(derived."averageTicket" / 200)::integer
              )
            )
          )::integer AS "score"
        FROM derived
      ),
      filtered AS (
        SELECT scored.*
        FROM scored
        WHERE ${Prisma.join(derivedFilters, " AND ")}
      ),
      totals AS (
        SELECT COUNT(*)::integer AS "totalCount"
        FROM filtered
      )
      SELECT
        page_rows."id",
        page_rows."firstName",
        page_rows."lastName",
        page_rows."email",
        page_rows."phone",
        page_rows."whatsapp",
        page_rows."instagram",
        page_rows."totalPurchased",
        page_rows."averageTicket",
        page_rows."orderCount",
        page_rows."status",
        page_rows."classification",
        page_rows."score",
        page_rows."daysInactive",
        page_rows."lastInteractionAt",
        page_rows."lastPurchaseAt",
        page_rows."ownerId",
        page_rows."ownerName",
        page_rows."teamId",
        page_rows."teamName",
        page_rows."existingOpenDealId",
        totals."totalCount"
      FROM totals
      LEFT JOIN LATERAL (
        SELECT filtered.*
        FROM filtered
        ORDER BY ${orderColumn} ${direction} NULLS LAST, filtered."id" ASC
        OFFSET ${skip}
        LIMIT ${pageSize}
      ) AS page_rows ON TRUE
    `);

    const total = rows[0] ? Math.max(0, Math.trunc(numericValue(rows[0].totalCount))) : 0;
    const data: ReactivationItemDto[] = rows.filter(isCandidateRow).map((row) => {
      const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
      return {
        id: row.id,
        contact: {
          id: row.id,
          name,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          whatsapp: row.whatsapp,
          instagram: row.instagram,
          totalPurchased: numericValue(row.totalPurchased),
          averageTicket: numericValue(row.averageTicket),
          orderCount: row.orderCount,
        },
        score: row.score,
        reason: REACTIVATION_REASONS[row.classification],
        status: row.status,
        classification: row.classification,
        daysInactive: row.daysInactive,
        lastInteractionAt: isoDate(row.lastInteractionAt),
        lastPurchaseAt: isoDate(row.lastPurchaseAt),
        owner:
          row.ownerId && row.ownerName
            ? { id: row.ownerId, name: row.ownerName }
            : null,
        team:
          row.teamId && row.teamName ? { id: row.teamId, name: row.teamName } : null,
        existingOpenDealId: row.existingOpenDealId,
      };
    });

    return paginate(data, total, page, pageSize);
  }
}
