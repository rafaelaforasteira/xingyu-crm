"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/form-controls";
import type { CustomerStatus, TrackedCustomer } from "./sales-tracking-types";
import { trackingFormatters } from "./sales-tracking-visuals";

type SortKey =
  "lifetimeValue" | "ordersCount" | "lastPurchaseAt" | "averageDaysBetweenOrders" | "periodRevenue";
const statusLabel: Record<CustomerStatus, string> = {
  NEW: "Novo",
  RECURRING: "Recorrente",
  REACTIVATED: "Reativado",
  AT_RISK: "Em risco",
  INACTIVE: "Inativo",
};

export function TrackedCustomersTable({ customers }: { customers: TrackedCustomer[] }) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<CustomerStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = React.useState<SortKey>("lifetimeValue");
  const [direction, setDirection] = React.useState<"asc" | "desc">("desc");

  const rows = React.useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return customers
      .filter((customer) => status === "ALL" || customer.customerStatus === status)
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

  const sort = (key: SortKey) => {
    if (sortKey === key) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection("desc");
    }
  };

  const Header = ({
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
      <th className={`px-3 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
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
            Da inteligência de vendas para o histórico completo no CRM.
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
            aria-label="Filtrar clientes por status"
          >
            <option value="ALL">Todos os status</option>
            <option value="NEW">Novos</option>
            <option value="RECURRING">Recorrentes</option>
            <option value="REACTIVATED">Reativados</option>
            <option value="AT_RISK">Em risco</option>
            <option value="INACTIVE">Inativos</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-y border-border/70 bg-muted/25 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-3 text-left font-medium">Status</th>
                <Header field="ordersCount">Pedidos</Header>
                <Header field="lifetimeValue">LTV</Header>
                <Header field="periodRevenue">Compra no período</Header>
                <Header field="lastPurchaseAt" align="left">
                  Última compra
                </Header>
                <th className="px-3 text-right font-medium">Dias desde a compra</th>
                <Header field="averageDaysBetweenOrders">Intervalo médio</Header>
                <th className="px-4 text-left font-medium">Vendedora</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border/60 transition-colors hover:bg-muted/25 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${encodeURIComponent(customer.id)}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      <span className="block">{customer.name}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {customer.email}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3">
                    <Badge variant={trackingFormatters.healthTone[customer.customerStatus]}>
                      {statusLabel[customer.customerStatus]}
                    </Badge>
                  </td>
                  <td className="px-3 text-right tabular-nums">{customer.ordersCount}</td>
                  <td className="px-3 text-right font-medium tabular-nums">
                    {trackingFormatters.money(customer.lifetimeValue)}
                  </td>
                  <td className="px-3 text-right font-medium tabular-nums">
                    {trackingFormatters.money(customer.periodRevenue)}
                  </td>
                  <td className="px-3">
                    {new Intl.DateTimeFormat("pt-BR").format(
                      new Date(`${customer.lastPurchaseAt}T12:00:00`),
                    )}
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {customer.daysSinceLastPurchase} dias
                  </td>
                  <td className="px-3 text-right tabular-nums">
                    {customer.averageDaysBetweenOrders == null
                      ? "—"
                      : `${customer.averageDaysBetweenOrders} dias`}
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
      </CardContent>
    </Card>
  );
}
