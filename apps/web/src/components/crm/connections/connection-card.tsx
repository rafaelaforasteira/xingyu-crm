"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import type { ConnectionListItem } from "@/lib/types";
import type { ConnectionsCopy } from "@/lib/connections-i18n";
import {
  connectionAccessLabel,
  connectionAccountLine,
  connectionBadgeLabel,
  connectionBadgeTone,
  connectionChannelVisual,
  connectionDestinationParts,
  connectionMetaIcons,
  connectionPipelinesSummary,
  formatConnectionActivity,
} from "@/lib/connections-format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ConnectionActionMenu, type ConnectionAction } from "./connection-action-menu";

export function ConnectionCard({
  connection,
  copy,
  locale,
  onOpen,
  onAction,
}: {
  connection: ConnectionListItem;
  copy: ConnectionsCopy;
  locale: string;
  onOpen: (connection: ConnectionListItem) => void;
  onAction: (action: ConnectionAction, connection: ConnectionListItem) => void;
}) {
  const visual = connectionChannelVisual(connection);
  const ChannelIcon = visual.icon;
  const destination = connectionDestinationParts(connection);
  const pipelines = connectionPipelinesSummary(connection, copy);
  const accessLabel = connectionAccessLabel(connection.accessSummary, copy);
  const activityLabel = formatConnectionActivity(connection.lastActivityAt, locale, copy.never);
  const accountLine = connectionAccountLine(connection, copy);
  const statusLabel = connectionBadgeLabel(connection, copy);

  return (
    <article
      data-testid="connection-card"
      data-channel-kind={visual.kind}
      className="cursor-pointer rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-none transition hover:border-primary/30 hover:shadow-soft"
      onClick={() => onOpen(connection)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(connection);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={connection.name}
    >
      <div className="flex items-start gap-3 sm:items-center">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            visual.containerClass,
          )}
        >
          <ChannelIcon className={visual.iconClass} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold leading-tight text-foreground">
              {connection.name}
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                connectionBadgeTone(connection),
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{accountLine}</p>
        </div>
        <div
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ConnectionActionMenu
            copy={copy}
            name={connection.name}
            status={connection.status}
            onAction={(action) => onAction(action, connection)}
          />
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-x-5 gap-y-3.5 border-t border-border/60 pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetaBlock
          icon={connectionMetaIcons.destination}
          label={copy.destination}
          testId="connection-meta-destination"
        >
          {destination.pipelineName ? (
            <div className="min-w-0 space-y-1">
              <PipelineChip label={destination.pipelineName} />
              {destination.stageName ? (
                <p className="truncate text-xs text-muted-foreground" title={destination.stageName}>
                  {destination.stageName}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-medium text-foreground">{copy.destinationUnset}</p>
          )}
        </MetaBlock>

        <MetaBlock
          icon={connectionMetaIcons.pipelines}
          label={copy.pipelines}
          testId="connection-meta-pipelines"
        >
          {pipelines.mode === "empty" ? (
            <p className="text-sm font-medium text-foreground">{copy.pipelinesNone}</p>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <PipelineChip label={pipelines.name} />
              {pipelines.mode === "multi" && pipelines.extra > 0 ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-primary/20 bg-primary/5 px-1.5 py-0 text-[11px] font-medium text-primary"
                  title={copy.pipelinesMany.replace("{count}", String(pipelines.extra + 1))}
                >
                  +{pipelines.extra}
                </Badge>
              ) : null}
            </div>
          )}
        </MetaBlock>

        <MetaBlock icon={connectionMetaIcons.access} label={copy.access} testId="connection-meta-access">
          <p className="truncate text-sm font-medium text-foreground" title={accessLabel}>
            {accessLabel}
          </p>
        </MetaBlock>

        <MetaBlock
          icon={connectionMetaIcons.activity}
          label={copy.lastActivity}
          testId="connection-meta-activity"
        >
          <p
            className="truncate text-sm font-medium text-foreground"
            title={
              connection.lastActivityAt
                ? new Date(connection.lastActivityAt).toLocaleString(locale)
                : undefined
            }
          >
            {activityLabel}
          </p>
        </MetaBlock>
      </div>
    </article>
  );
}

function PipelineChip({ label }: { label: string }) {
  return (
    <Badge
      variant="default"
      className="max-w-full truncate px-2 py-0.5 font-medium"
      title={label}
    >
      {label}
    </Badge>
  );
}

function MetaBlock({
  icon: Icon,
  label,
  children,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex min-w-0 items-start justify-self-center gap-2.5 text-left sm:w-full sm:justify-self-stretch"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden data-meta-icon />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-1.5 min-w-0">{children}</div>
      </div>
    </div>
  );
}
