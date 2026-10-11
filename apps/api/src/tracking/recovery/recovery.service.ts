import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RecoveryOpportunitiesData, RecoveryOverviewData, RecoveryQuery } from "@xingyu/types";
import { RECOVERY_DATA_SOURCE, type RecoveryDataSource } from "./recovery-data-source";
import { reconcileRecovery } from "./recovery-matching";
import { analyzeRecovery, recoveryOpportunities } from "./recovery-analytics";
import { businessDate, shiftDate, sumCents } from "./recovery-math";
import { DAY_MS, RECOVERY_RULES, VALUE_BANDS } from "./recovery.config";
import { RecoveryQueryDto } from "./recovery-query.dto";
import { buildTrainingDataset, LearningRecoveryModelProvider } from "./recovery-model";

@Injectable()
export class RecoveryService {
  constructor(@Inject(RECOVERY_DATA_SOURCE) private readonly source: RecoveryDataSource) {}
  private async context(org: string, query: RecoveryQueryDto, asOf = new Date().toISOString()) {
    if (!org) throw new BadRequestException("Organização autenticada obrigatória.");
    const dataset = await this.source.load(org, asOf);
    const today = businessDate(asOf, dataset.timezone);
    const q: RecoveryQuery = {
      ...query,
      startDate: query.startDate ?? shiftDate(today, -29),
      endDate: query.endDate ?? today,
      currency: query.currency ?? "BRL",
    };
    const valid = (d: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(d) &&
      Number.isFinite(Date.parse(d)) &&
      new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d;
    if (
      !valid(q.startDate) ||
      !valid(q.endDate) ||
      q.startDate > q.endDate ||
      q.endDate > today ||
      (Date.parse(q.endDate) - Date.parse(q.startDate)) / DAY_MS + 1 > RECOVERY_RULES.maxRangeDays
    )
      throw new BadRequestException(
        "Selecione um intervalo válido de até 366 dias, sem datas futuras.",
      );
    const normalized = reconcileRecovery(dataset.checkouts, dataset.orders, org, asOf);
    return { dataset, q, ...normalized, asOf };
  }
  async overview(org: string, query: RecoveryQueryDto): Promise<RecoveryOverviewData> {
    const { dataset, q, cases, quality, asOf } = await this.context(org, query);
    const analytics = analyzeRecovery(cases, q, dataset.timezone, dataset.source);
    quality.excludedCurrencyCases = cases.filter((c) => c.currency !== q.currency).length;
    quality.excludedMlCases = analytics.predictionStatus.excludedCases;
    const s = analytics.summary;
    const selectedOrders = cases
      .filter((c) => c.recoveredOrder)
      .map((c) => `${c.provider}:${c.recoveredOrder!.id}`);
    return {
      ...analytics,
      source: dataset.source,
      provider: dataset.provider,
      updatedAt: asOf,
      timezone: dataset.timezone,
      currency: q.currency!,
      attributionDays: RECOVERY_RULES.attributionDays,
      dataQuality: {
        ...quality,
        reconciliation: {
          cases: s.eligibleCases === s.openCases + s.recoveredCases + s.expiredCases,
          methods: analytics.methodBreakdown.reduce((n, m) => n + m.cases, 0) === s.recoveredCases,
          revenue:
            sumCents(analytics.methodBreakdown.map((m) => m.revenueCents)) === s.recoveredCents,
          time:
            analytics.timeToRecovery.buckets.reduce((n, b) => n + b.cases, 0) === s.recoveredCases,
          uniqueOrders: new Set(selectedOrders).size === selectedOrders.length,
        },
      },
      filterOptions: {
        channels: [...new Set(cases.map((c) => c.acquisition.channel))].sort(),
        currencies: [...new Set(cases.map((c) => c.currency))].sort(),
        valueBands: VALUE_BANDS.map(({ key, label }) => ({ key, label })),
      },
    };
  }
  async opportunities(org: string, query: RecoveryQueryDto): Promise<RecoveryOpportunitiesData> {
    const { dataset, q, cases, asOf } = await this.context(org, query);
    const model = new LearningRecoveryModelProvider().describe(
      buildTrainingDataset(
        cases.filter((c) => c.currency === q.currency),
        dataset.timezone,
      ),
      dataset.source,
    );
    let rows = recoveryOpportunities(cases, q, dataset.timezone, asOf, model);
    const search = q.search?.trim().toLocaleLowerCase("pt-BR");
    if (search)
      rows = rows.filter((r) =>
        `${r.checkoutLabel} ${r.customerLabel}`.toLocaleLowerCase("pt-BR").includes(search),
      );
    rows.sort((a, b) => {
      const primary =
        q.sort === "value"
          ? b.abandonedCents - a.abandonedCents
          : q.sort === "oldest"
            ? a.abandonedAt.localeCompare(b.abandonedAt)
            : q.sort === "deadline"
              ? a.remainingHours - b.remainingHours
              : (b.expectedCents ?? b.historicalEstimateCents ?? b.abandonedCents) -
                (a.expectedCents ?? a.historicalEstimateCents ?? a.abandonedCents);
      return primary || a.remainingHours - b.remainingHours || a.id.localeCompare(b.id);
    });
    const total = rows.length,
      pageSize = q.pageSize ?? 10,
      pageCount = Math.max(1, Math.ceil(total / pageSize)),
      page = Math.min(q.page ?? 1, pageCount);
    return {
      source: dataset.source,
      currency: q.currency!,
      data: rows.slice((page - 1) * pageSize, page * pageSize),
      meta: { total, page, pageSize, pageCount },
    };
  }
  async caseAudit(org: string, id: string) {
    const { cases, dataset } = await this.context(org, {});
    const recovery = cases.find((c) => c.id === id);
    if (!recovery) throw new NotFoundException("Caso não encontrado nesta organização.");
    return { source: dataset.source, case: recovery };
  }
}
