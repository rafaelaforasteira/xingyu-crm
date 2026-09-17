"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/form-controls";
import { Avatar } from "@/components/ui/avatar";
import { PaginationBar } from "@/components/crm/page-header";
import type { CustomerStatus, TrackedCustomer } from "./sales-tracking-types";
import { money, days, dateBR, integer } from "./tracking-format";

type SortKey =
  "lifetimeValue" | "ordersCount" | "lastPurchaseAt" | "averageDaysBetweenOrders" | "periodRevenue";

export function TrackedCustomersTable({ customers }: { customers: TrackedCustomer[] }) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<CustomerStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = React.useState<SortKey>("lifetimeValue");
  const [direction, setDirection] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setPage(1), [customers, search, status, sortKey, direction]);

  const rows = React.useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return customers
      .filter(
        (customer) =>
          status === "ALL" ||
          (status === "NEW" && customer.acquisitionType === "NEW") ||
          (status === "RECURRING" && customer.acquisitionType === "EXISTING") ||
          (status === "REACTIVATED" && customer.isReactivated),
      )
      .filter(
        (customer) =>
          !term ||
          `${customer.name} ${customer.email} ${customer.phone}`
            .toLocaleLowerCase("pt-BR")
            .includes(term),
      )
      .sort((a, b) => {
        const left =
          sortKey === "lastPurchaseAt" ? new Date(a.lastPurchaseAt).getTime() : (a[sortKey] ?? -1);
        const right =
          sortKey === "lastPurchaseAt" ? new Date(b.lastPurchaseAt).getTime() : (b[sortKey] ?? -1);
        return (Number(left) - Number(right)) * (direction === "asc" ? 1 : -1);
      });
  }, [customers, direction, search, sortKey, status]);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const sort = (key: SortKey) => {
    if (sortKey === key) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection("desc");
    }
  };

  const renderHeader = ({
    field,
    children,
    align = "right",
  }: {
    field: SortKey;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => {
    const active = field === sortKey;
    const Icon = direction === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
        className={`px-3 py-3 ${align === "right" ? "text-right" : "text-left"}`}
      >
        <button
          type="button"
          onClick={() => sort(field)}
          className={`inline-flex items-center gap-1 font-medium hover:text-primary ${active ? "text-primary" : ""}`}
        >
          {children}
          {active ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
        </button>
      </th>
    );
  };

  return (
    <Card className="overflow-hidden rounded-2xl shadow-soft">
      <CardHeader className="gap-3">
        <div>
          <CardTitle>Clientes do período</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Pedidos totais, LTV e última compra até a data final da análise.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Buscar por nome, telefone ou e-mail"
              aria-label="Buscar clientes do período"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as CustomerStatus | "ALL")}
            className="sm:w-44"
            aria-label="Filtrar clientes por perfil"
          >
            <option value="ALL">Todos os perfis</option>
            <option value="NEW">Novos</option>
            <option value="RECURRING">Base existente</option>
            <option value="REACTIVATED">Reativados</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-y border-border/70 bg-muted/25 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-3 text-left font-medium">Perfil</th>
                {renderHeader({ field: "ordersCount", children: "Pedidos totais" })}
                {renderHeader({ field: "lifetimeValue", children: "LTV" })}
                {renderHeader({ field: "periodRevenue", children: "Receita no período" })}
                {renderHeader({ field: "lastPurchaseAt", children: "Última compra", align: "left" })}
                <th className="px-3 text-right font-medium">Dias desde a compra</th>
                {renderHeader({ field: "averageDaysBetweenOrders", children: "Intervalo médio" })}
                <th className="px-4 text-left font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border/60 transition-colors hover:bg-muted/25 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={customer.name} size="sm" />
                      <div className="min-w-0">
                        {customer.crmProfileId ? (
                          <Link
                            href={`/clients/${encodeURIComponent(customer.crmProfileId)}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {customer.name}
                          </Link>
                        ) : (
                          <span className="block font-medium">{customer.name}</span>
                        )}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {customer.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={customer.acquisitionType === "NEW" ? "default" : "secondary"}>
                        {customer.acquisitionType === "NEW" ? "Novo" : "Base"}
                      </Badge>
                      {customer.isReactivated && <Badge variant="success">Reativado</Badge>}
                    </div>
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {integer(customer.ordersCount)}
                    <span className="block text-[10px] text-muted-foreground">
                      {integer(customer.periodOrders)} no período
                    </span>
                  </td>
                  <td className="px-3 text-right font-medium tabular-nums">
                    {money(customer.lifetimeValue)}
                  </td>
                  <td className="px-3 text-right font-medium tabular-nums">
                    {money(customer.periodRevenue)}
                  </td>
                  <td className="px-3">{dateBR(customer.lastPurchaseAt)}</td>
                  <td className="px-3 text-right tabular-nums">
                    {customer.daysSinceLastPurchase} dias
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {customer.averageDaysBetweenOrders == null
                      ? "—"
                      : days(customer.averageDaysBetweenOrders)}
                  </td>
                  <td className="px-4">{customer.salesperson}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <div className="py-12 text-center">
              <UsersRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum cliente encontrado com estes filtros.
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {integer(rows.length)} clientes ·{" "}
            {visibleRows.length ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, rows.length)} exibidos
          </p>
          <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
        {customers.some((customer) => !customer.crmProfileId) && (
          <p className="px-4 pb-4 text-[11px] text-muted-foreground">
            Clientes demonstrativos sem vínculo com um cadastro real. Perfis vinculados abrem o
            histórico existente no CRM.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
