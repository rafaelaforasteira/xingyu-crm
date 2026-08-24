"use client";

import * as React from "react";
import { Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsActionItem } from "@/components/crm/settings/settings-action-menu";
import type { ConnectionsCopy } from "@/lib/connections-i18n";

export type ConnectionAction =
  | "open" | "edit" | "routing" | "access" | "diagnostics"
  | "reconnect" | "disconnect" | "archive";

export function ConnectionActionMenu({
  copy,
  name,
  onAction,
}: {
  copy: ConnectionsCopy;
  name: string;
  onAction: (action: ConnectionAction) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  const actions: Array<[ConnectionAction, string, boolean?]> = [
    ["open", copy.open], ["edit", copy.edit], ["routing", copy.routing],
    ["access", copy.access], ["diagnostics", copy.diagnostics], ["reconnect", copy.reconnect],
    ["disconnect", copy.disconnect, true], ["archive", copy.archive, true],
  ];
  return (
    <div className="relative" ref={ref}>
      <Button type="button" variant="ghost" size="icon" aria-label={`${copy.settings} · ${name}`}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Cog className="h-4 w-4" />
      </Button>
      {open ? (
        <div role="menu" className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-lg border bg-card p-1 shadow-soft">
          {actions.map(([id, label, destructive]) => (
            <SettingsActionItem key={id} destructive={destructive} onClick={() => {
              setOpen(false);
              onAction(id);
            }}>
              {label}
            </SettingsActionItem>
          ))}
        </div>
      ) : null}
    </div>
  );
}
