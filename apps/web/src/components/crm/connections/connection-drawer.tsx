"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectionsApi } from "@/lib/api";
import type { ConnectionsCopy } from "@/lib/connections-i18n";
import type { ConnectionListItem } from "@/lib/types";
import { connectionStatusLabel, connectionStatusTone, formatConnectionActivity } from "@/lib/connections-format";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/crm/page-header";

export type ConnectionSection = "overview" | "routing" | "access" | "diagnostics" | "activity";

export function ConnectionDrawer({
  connection, section, copy, locale, onClose,
}: {
  connection: ConnectionListItem | null;
  section: ConnectionSection;
  copy: ConnectionsCopy;
  locale: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [active, setActive] = React.useState(section);
  const [name, setName] = React.useState("");
  React.useEffect(() => setActive(section), [section, connection?.id]);
  const detail = useQuery({
    queryKey: ["connections", connection?.id],
    queryFn: () => connectionsApi.detail(connection!.id),
    enabled: Boolean(connection),
  });
  const diagnostics = useQuery({
    queryKey: ["connections", connection?.id, "diagnostics"],
    queryFn: () => connectionsApi.diagnostics(connection!.id),
    enabled: Boolean(connection && active === "diagnostics"),
  });
  const activity = useQuery({
    queryKey: ["connections", connection?.id, "activity"],
    queryFn: () => connectionsApi.activity(connection!.id),
    enabled: Boolean(connection && active === "activity"),
  });
  React.useEffect(() => setName(detail.data?.name ?? connection?.name ?? ""), [detail.data?.name, connection]);
  const save = useMutation({
    mutationFn: () => connectionsApi.update(connection!.id, { name }),
    onSuccess: () => {
      toast.success(copy.actionSuccess);
      void qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const data = detail.data ?? connection;
  const tabs: Array<[ConnectionSection, string]> = [
    ["overview", copy.overview], ["routing", copy.routing], ["access", copy.access],
    ["diagnostics", copy.diagnostics], ["activity", copy.activity],
  ];
  return (
    <Dialog open={Boolean(connection)} onOpenChange={(open) => !open && onClose()}
      title={data?.name ?? copy.title} description={data ? connectionStatusLabel(data.status, copy) : undefined}
      wide className="max-h-[88vh] max-w-4xl overflow-hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-border/70 pb-3">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setActive(id)}
            className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium", active === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            {label}
          </button>
        ))}
      </div>
      <div className="max-h-[62vh] overflow-y-auto pt-4">
        {detail.isLoading ? <Skeleton className="h-52 w-full" /> : null}
        {detail.error ? <ErrorBanner message={copy.loadError} /> : null}
        {!detail.isLoading && data ? (
          <>
            {active === "overview" ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label={copy.provider} value={data.provider || copy.whatsapp} />
                  <Info label={copy.phone} value={data.displayAccount || data.phone || "—"} />
                  <Info label={copy.lastActivity} value={formatConnectionActivity(data.lastActivityAt, locale, copy.never)} />
                  <Info label={copy.statusConnected} value={connectionStatusLabel(data.status, copy)}
                    className={connectionStatusTone(data.status)} />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium">{copy.connectionName}</label>
                    <Input value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>{copy.save}</Button>
                </div>
              </div>
            ) : null}
            {active === "routing" ? <KeyValues values={detail.data?.routing} empty={copy.routeHint} /> : null}
            {active === "access" ? <KeyValues values={detail.data?.access} empty={copy.accessHint} /> : null}
            {active === "diagnostics" ? diagnostics.isLoading ? <Skeleton className="h-32 w-full" /> :
              <KeyValues values={diagnostics.data ?? detail.data?.diagnostics} empty={copy.noData} /> : null}
            {active === "activity" ? (
              activity.isLoading ? <Skeleton className="h-32 w-full" /> :
              (activity.data ?? detail.data?.activity)?.length ? <div className="space-y-3">{(activity.data ?? detail.data?.activity ?? []).map((item) => (
                <div key={item.id} className="rounded-lg border border-border/70 p-3">
                  <p className="text-sm font-medium">{item.message || item.type}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatConnectionActivity(item.createdAt, locale, copy.never)}</p>
                </div>
              ))}</div> : <p className="text-sm text-muted-foreground">{copy.noData}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return <div className="rounded-lg border border-border/70 p-3"><p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("mt-1 text-sm font-medium", className)}>{value}</p></div>;
}

function KeyValues({ values, empty }: { values?: object; empty: string }) {
  if (!values || !Object.keys(values).length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <dl className="divide-y divide-border/70 rounded-lg border border-border/70">{Object.entries(values).map(([key, value]) => (
    <div key={key} className="grid grid-cols-2 gap-3 px-3 py-2 text-sm"><dt className="text-muted-foreground">{key}</dt>
      <dd className="break-words text-right">{Array.isArray(value) ? value.join(", ") || "—" : String(value ?? "—")}</dd></div>
  ))}</dl>;
}
