"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsActionItem } from "@/components/crm/settings/settings-action-menu";
import type { ConnectionsCopy } from "@/lib/connections-i18n";
import {
  connectionCanDisconnect,
  connectionCanReconnect,
  type ConnectionMenuAction,
} from "@/lib/connections-format";

export type ConnectionAction = ConnectionMenuAction;

export function ConnectionActionMenu({
  copy,
  name,
  status,
  onAction,
}: {
  copy: ConnectionsCopy;
  name: string;
  status: string;
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

  const actions: Array<{ id: ConnectionAction; label: string; destructive?: boolean }> = [
    { id: "edit", label: copy.edit },
  ];
  if (connectionCanDisconnect(status)) {
    actions.push({ id: "disconnect", label: copy.disconnect });
  }
  if (connectionCanReconnect(status)) {
    actions.push({ id: "reconnect", label: copy.reconnect });
  }
  actions.push({ id: "delete", label: copy.deleteConnection, destructive: true });

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${copy.settings} · ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-lg border bg-card p-1 shadow-soft"
          onClick={(event) => event.stopPropagation()}
        >
          {actions.map((action) => (
            <SettingsActionItem
              key={action.id}
              destructive={action.destructive}
              onClick={() => {
                setOpen(false);
                onAction(action.id);
              }}
            >
              {action.label}
            </SettingsActionItem>
          ))}
        </div>
      ) : null}
    </div>
  );
}
