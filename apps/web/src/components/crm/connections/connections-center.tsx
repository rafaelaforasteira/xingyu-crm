"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { canOpenPath } from "@/lib/access-policy";
import { connectionsApi } from "@/lib/api";
import { connectionsText } from "@/lib/connections-i18n";
import type { ConnectionListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionCard } from "./connection-card";
import { ConnectionDrawer, type ConnectionSection } from "./connection-drawer";
import { ConnectionWizard } from "./connection-wizard";
import type { ConnectionAction } from "./connection-action-menu";

type Filter = "ALL" | "CONNECTED" | "ATTENTION" | "OFFLINE";

export function ConnectionsCenter() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const copy = connectionsText(user?.locale);
  const locale = user?.locale ?? "pt-BR";
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ConnectionListItem | null>(null);
  const [section, setSection] = React.useState<ConnectionSection>("overview");

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    if (!authLoading && !canOpenPath(user, "/connections")) router.replace("/dashboard");
  }, [authLoading, router, user]);

  const allowed = canOpenPath(user, "/connections");
  const list = useQuery({
    queryKey: ["connections", "list", filter, debouncedSearch],
    queryFn: () => connectionsApi.list({
      status: filter === "ALL" ? undefined : filter,
      search: debouncedSearch || undefined,
    }),
    enabled: allowed,
    refetchInterval: 20_000,
  });
  const counts = useQuery({
    queryKey: ["connections", "counts"],
    queryFn: connectionsApi.counts,
    enabled: allowed,
  });
  const action = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "reconnect" | "disconnect" | "archive" }) => {
      if (kind === "reconnect") return connectionsApi.reconnect(id);
      if (kind === "disconnect") return connectionsApi.disconnect(id);
      return connectionsApi.archive(id);
    },
    onSuccess: () => {
      toast.success(copy.actionSuccess);
      void qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (authLoading || !allowed) return <Skeleton className="mx-auto h-64 w-full max-w-6xl" />;
  const rows = list.data ?? [];
  const derived = {
    all: rows.length,
    connected: rows.filter((item) => item.status === "CONNECTED").length,
    attention: rows.filter((item) => item.status === "ATTENTION" || item.status === "ERROR").length,
    offline: rows.filter((item) => ["OFFLINE", "DISCONNECTED"].includes(item.status)).length,
  };
  const totals = counts.data ?? derived;
  const filters: Array<[Filter, string, number, string?]> = [
    ["ALL", copy.all, totals.all], ["CONNECTED", copy.connected, totals.connected, "bg-emerald-500"],
    ["ATTENTION", copy.attention, totals.attention, "bg-amber-500"], ["OFFLINE", copy.offline, totals.offline, "bg-muted-foreground/60"],
  ];
  const openSection = (connection: ConnectionListItem, next: ConnectionSection) => {
    setSelected(connection); setSection(next);
  };
  const onAction = (kind: ConnectionAction, connection: ConnectionListItem) => {
    if (kind === "open" || kind === "edit") return openSection(connection, "overview");
    if (kind === "routing" || kind === "access" || kind === "diagnostics") return openSection(connection, kind);
    action.mutate({ id: connection.id, kind });
  };
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader title={copy.title} description={copy.subtitle} />
      <Card className="border-border/80 shadow-none">
        <CardHeader className="space-y-4 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div role="tablist" aria-label={copy.title} className="flex gap-1.5 overflow-x-auto">
              {filters.map(([id, label, count, dot]) => <button key={id} type="button" role="tab"
                aria-selected={filter === id} onClick={() => setFilter(id)}
                className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
                  filter === id ? "border-primary/35 bg-primary/10 text-primary" : "border-border/80 text-muted-foreground hover:text-foreground")}>
                {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> : null}{label}
                <span className="tabular-nums">{count}</span>
              </button>)}
            </div>
            <div className="flex w-full gap-2 sm:w-auto xl:ml-auto">
              <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} aria-label={copy.search} className="h-9 pl-9" />
              </div>
              <Button className="h-9 gap-1.5" onClick={() => setWizardOpen(true)}><Plus className="h-4 w-4" />{copy.newConnection}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {list.error ? <ErrorBanner message={copy.loadError} /> : null}
          {list.isLoading ? <><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></> : null}
          {!list.isLoading && !list.error && !rows.length ? <div className="rounded-xl border border-dashed border-border/80 px-4 py-12 text-center">
            <QrCode className="mx-auto h-9 w-9 text-muted-foreground/60" /><p className="mt-3 text-sm font-medium">{copy.emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{copy.emptyBody}</p>
            <Button size="sm" className="mt-4" onClick={() => setWizardOpen(true)}><Plus className="h-3.5 w-3.5" />{copy.newConnection}</Button>
          </div> : null}
          {rows.map((connection) => <ConnectionCard key={connection.id} connection={connection} copy={copy} locale={locale} onAction={onAction} />)}
        </CardContent>
      </Card>
      <ConnectionDrawer connection={selected} section={section} copy={copy} locale={locale} onClose={() => setSelected(null)} />
      <ConnectionWizard open={wizardOpen} copy={copy} onOpenChange={setWizardOpen} />
    </div>
  );
}
