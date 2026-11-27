"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectionsApi, pipelinesApi, settingsApi } from "@/lib/api";
import type { ConnectionsCopy } from "@/lib/connections-i18n";
import type { ConnectionDetail, ConnectionListItem } from "@/lib/types";
import {
  connectionStatusLabel,
  connectionStatusTone,
  formatConnectionActivity,
  formatConnectionScalar,
} from "@/lib/connections-format";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/crm/page-header";

export type ConnectionSection = "overview" | "routing" | "access" | "diagnostics" | "activity";

export function ConnectionDrawer({
  connection,
  section,
  copy,
  locale,
  onClose,
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
    ["overview", copy.overview],
    ["routing", copy.routing],
    ["access", copy.access],
    ["diagnostics", copy.diagnostics],
    ["activity", copy.activity],
  ];
  return (
    <Dialog
      open={Boolean(connection)}
      onOpenChange={(open) => !open && onClose()}
      title={data?.name ?? copy.title}
      description={data ? connectionStatusLabel(data.status, copy) : undefined}
      wide
      className="max-h-[88vh] max-w-4xl overflow-hidden"
    >
      <div className="flex gap-1 overflow-x-auto border-b border-border/70 px-5 pb-3 pt-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium",
              active === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="max-h-[62vh] overflow-y-auto px-5 pb-5 pt-4">
        {detail.isLoading ? <Skeleton className="h-52 w-full" /> : null}
        {detail.error ? <ErrorBanner message={copy.loadError} /> : null}
        {!detail.isLoading && data ? (
          <>
            {active === "overview" ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label={copy.provider} value={formatConnectionScalar(data.provider) || copy.whatsapp} />
                  <Info
                    label={copy.phone}
                    value={formatConnectionScalar(data.displayAccount || data.phone)}
                  />
                  <Info
                    label={copy.lastActivity}
                    value={formatConnectionActivity(data.lastActivityAt, locale, copy.never)}
                  />
                  <Info
                    label={copy.providerStatus}
                    value={connectionStatusLabel(data.status, copy)}
                    className={connectionStatusTone(data.status)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium">{copy.connectionName}</label>
                    <Input value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
                    {copy.save}
                  </Button>
                </div>
              </div>
            ) : null}
            {active === "routing" && connection ? (
              <RoutingSection connectionId={connection.id} detail={detail.data} copy={copy} />
            ) : null}
            {active === "access" && connection ? (
              <AccessSection connectionId={connection.id} detail={detail.data} copy={copy} />
            ) : null}
            {active === "diagnostics" ? (
              diagnostics.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <DiagnosticsSection data={diagnostics.data} copy={copy} locale={locale} />
              )
            ) : null}
            {active === "activity" ? (
              activity.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (activity.data ?? detail.data?.activity)?.length ? (
                <div className="space-y-3">
                  {(activity.data ?? detail.data?.activity ?? []).map((item) => (
                    <div key={item.id} className="rounded-lg border border-border/70 p-3">
                      <p className="text-sm font-medium">
                        {formatConnectionScalar(item.message || item.type)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatConnectionActivity(item.createdAt, locale, copy.never)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.noData}</p>
              )
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-medium", className)}>{value}</p>
    </div>
  );
}

function RoutingSection({
  connectionId,
  detail,
  copy,
}: {
  connectionId: string;
  detail?: ConnectionDetail;
  copy: ConnectionsCopy;
}) {
  const qc = useQueryClient();
  const pipelines = useQuery({
    queryKey: ["connections", "pipelines"],
    queryFn: () => pipelinesApi.list({ pageSize: 100 }),
  });
  const enabledFromDetail =
    detail?.routing?.enabledPipelines?.map((route) => route.pipelineId) ??
    (detail?.defaultPipeline?.id ? [detail.defaultPipeline.id] : []);
  const defaultFromDetail =
    detail?.routing?.defaultPipelineId ?? detail?.defaultPipeline?.id ?? "";
  const [enabledIds, setEnabledIds] = React.useState<string[]>(enabledFromDetail);
  const [defaultId, setDefaultId] = React.useState(defaultFromDetail);
  React.useEffect(() => {
    setEnabledIds(enabledFromDetail);
    setDefaultId(defaultFromDetail);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when detail payload changes
  }, [detail?.id, detail?.routing?.defaultPipelineId, detail?.routing?.enabledPipelines?.length]);

  const save = useMutation({
    mutationFn: () =>
      connectionsApi.routing(connectionId, {
        enabledPipelineIds: enabledIds,
        defaultPipelineId: defaultId,
      }),
    onSuccess: () => {
      toast.success(copy.actionSuccess);
      void qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = pipelines.data?.data ?? [];
  const toggle = (pipelineId: string) => {
    setEnabledIds((current) => {
      const next = current.includes(pipelineId)
        ? current.filter((id) => id !== pipelineId)
        : [...current, pipelineId];
      if (!next.includes(defaultId)) {
        setDefaultId(next[0] ?? "");
      }
      if (next.length === 1) setDefaultId(next[0] ?? "");
      return next;
    });
  };

  const defaultStageName = detail?.routing?.defaultStageName;
  const canSave = enabledIds.length > 0 && enabledIds.includes(defaultId) && !save.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{copy.routingTitle}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{copy.routeHint}</p>
      </div>
      {pipelines.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {!pipelines.isLoading && !rows.length ? (
        <p className="text-sm text-muted-foreground">{copy.noData}</p>
      ) : null}
      {rows.length ? (
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.enabledPipelines}
            </p>
            <ul className="space-y-2">
              {rows.map((pipeline) => {
                const checked = enabledIds.includes(pipeline.id);
                return (
                  <li key={pipeline.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(pipeline.id)}
                      />
                      <span className="font-medium">{pipeline.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">{copy.defaultPipeline}</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={defaultId}
              onChange={(event) => setDefaultId(event.target.value)}
              disabled={!enabledIds.length}
            >
              <option value="">{copy.destination}</option>
              {rows
                .filter((pipeline) => enabledIds.includes(pipeline.id))
                .map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
            </select>
          </div>
          {defaultStageName ? (
            <Info label={copy.initialStage} value={defaultStageName} />
          ) : null}
          <div className="flex justify-end">
            <Button disabled={!canSave} onClick={() => save.mutate()}>
              {copy.save}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AccessSection({
  connectionId,
  detail,
  copy,
}: {
  connectionId: string;
  detail?: ConnectionDetail;
  copy: ConnectionsCopy;
}) {
  const qc = useQueryClient();
  const teams = useQuery({
    queryKey: ["connections", "teams"],
    queryFn: () => settingsApi.teams(),
  });
  const modeAll =
    !detail?.access?.mode ||
    detail.access.mode === "ORGANIZATION" ||
    detail.access.mode === "ALL";
  const [restricted, setRestricted] = React.useState(!modeAll);
  const [teamIds, setTeamIds] = React.useState<string[]>(detail?.access?.teamIds ?? []);
  React.useEffect(() => {
    setRestricted(!modeAll);
    setTeamIds(detail?.access?.teamIds ?? detail?.access?.teams?.map((team) => team.id) ?? []);
  }, [detail?.id, detail?.access?.mode, detail?.access?.teamIds, detail?.access?.teams]);

  const save = useMutation({
    mutationFn: () =>
      connectionsApi.access(connectionId, {
        teamIds: restricted ? teamIds : [],
        userIds: [],
      }),
    onSuccess: () => {
      toast.success(copy.actionSuccess);
      void qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const teamRows = teams.data ?? [];
  const teamNames = formatConnectionScalar(
    detail?.access?.teams?.map((team) => team.name) ?? [],
  );
  const userNames = formatConnectionScalar(
    detail?.access?.users?.map((user) => user.name) ?? [],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{copy.accessHint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label={copy.access} value={restricted ? copy.restricted : copy.allUsers} />
        <Info label={copy.teams} value={teamNames} />
        <Info label={copy.users} value={userNames} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={!restricted ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setRestricted(false);
            setTeamIds([]);
          }}
        >
          {copy.allUsers}
        </Button>
        <Button
          type="button"
          variant={restricted ? "default" : "outline"}
          size="sm"
          onClick={() => setRestricted(true)}
        >
          {copy.restricted}
        </Button>
      </div>
      {restricted ? (
        teams.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <ul className="space-y-2">
            {teamRows.map((team) => {
              const checked = teamIds.includes(team.id);
              return (
                <li key={team.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setTeamIds((current) =>
                          checked
                            ? current.filter((id) => id !== team.id)
                            : [...current, team.id],
                        )
                      }
                    />
                    <span>{team.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
      <div className="flex justify-end">
        <Button disabled={save.isPending || (restricted && !teamIds.length)} onClick={() => save.mutate()}>
          {copy.save}
        </Button>
      </div>
    </div>
  );
}

function DiagnosticsSection({
  data,
  copy,
  locale,
}: {
  data?: ConnectionDetail["diagnostics"] | null;
  copy: ConnectionsCopy;
  locale: string;
}) {
  if (!data) return <p className="text-sm text-muted-foreground">{copy.noData}</p>;
  const routing = data.routing;
  const checks = data.checks;
  const routingText = [
    routing?.defaultPipelineName
      ? `${copy.defaultPipeline}: ${routing.defaultPipelineName}`
      : null,
    routing?.defaultStageName ? `${copy.initialStage}: ${routing.defaultStageName}` : null,
    routing?.enabledPipelineNames?.length
      ? `${copy.enabledPipelines}: ${routing.enabledPipelineNames.join(", ")}`
      : routing?.enabledPipelineCount != null
        ? `${copy.pipelines}: ${routing.enabledPipelineCount}`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Info
        label={copy.providerStatus}
        value={connectionStatusLabel(String(data.status ?? ""), copy)}
        className={connectionStatusTone(String(data.status ?? ""))}
      />
      <Info label={copy.provider} value={formatConnectionScalar(data.provider)} />
      <Info
        label={copy.configurationComplete}
        value={data.configurationComplete ? copy.configurationYes : copy.configurationNo}
      />
      <Info
        label={copy.lastActivity}
        value={formatConnectionActivity(
          typeof data.lastActivityAt === "string" ? data.lastActivityAt : null,
          locale,
          copy.never,
        )}
      />
      <Info label={copy.routingSummary} value={routingText || copy.noData} />
      <Info
        label={copy.checks}
        value={[
          checks
            ? `Provider: ${checks.providerConfigured ? copy.checkOk : copy.checkMissing}`
            : null,
          checks
            ? `Routing: ${checks.routingConfigured ? copy.checkOk : copy.checkMissing}`
            : null,
          data.lastErrorCode ? `Error: ${formatConnectionScalar(data.lastErrorCode)}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || copy.noData}
      />
    </div>
  );
}
