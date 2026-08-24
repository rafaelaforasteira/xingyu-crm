import { MessageCircleMore } from "lucide-react";
import type { ConnectionListItem } from "@/lib/types";
import type { ConnectionsCopy } from "@/lib/connections-i18n";
import {
  connectionStatusLabel,
  connectionStatusTone,
  formatConnectionActivity,
} from "@/lib/connections-format";
import { cn } from "@/lib/utils";
import { ConnectionActionMenu, type ConnectionAction } from "./connection-action-menu";

export function ConnectionCard({
  connection,
  copy,
  locale,
  onAction,
}: {
  connection: ConnectionListItem;
  copy: ConnectionsCopy;
  locale: string;
  onAction: (action: ConnectionAction, connection: ConnectionListItem) => void;
}) {
  const destination = connection.defaultPipeline?.name ?? "—";
  const pipelinesLabel =
    connection.enabledPipelineCount != null
      ? `${connection.enabledPipelineCount} ${copy.pipelinesEnabledShort}`
      : "—";

  return (
    <article className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-none transition hover:border-border">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
          <MessageCircleMore className="h-5 w-5" aria-hidden />
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onAction("open", connection)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">{connection.name}</h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                connectionStatusTone(connection.status),
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {connectionStatusLabel(connection.status, copy)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {connection.displayAccount || connection.phone || copy.noAccount}
          </p>
        </button>
        <ConnectionActionMenu
          copy={copy}
          name={connection.name}
          onAction={(action) => onAction(action, connection)}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-xs sm:grid-cols-4">
        <Meta label={copy.destination} value={destination} />
        <Meta label={copy.pipelines} value={pipelinesLabel} />
        <Meta label={copy.access} value={connection.accessSummary || "—"} />
        <Meta
          label={copy.lastActivity}
          value={formatConnectionActivity(connection.lastActivityAt, locale, copy.never)}
        />
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium text-foreground">{value}</p>
    </div>
  );
}
