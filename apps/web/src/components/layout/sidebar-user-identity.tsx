"use client";

import { Avatar } from "@/components/ui/avatar";
import { displayFirstName } from "@/lib/names";
import { cn } from "@/lib/utils";

export function SidebarUserIdentity({
  name,
  avatarUrl,
  collapsed,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  collapsed: boolean;
}) {
  const firstName = displayFirstName(name);
  return (
    <div
      data-testid="sidebar-user-identity"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2 py-2",
        collapsed && "justify-center px-0",
      )}
      title={collapsed ? firstName : undefined}
    >
      <Avatar name={name ?? firstName} src={avatarUrl} size="sm" className="bg-white/10 text-white" />
      {!collapsed ? (
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{firstName}</p>
      ) : null}
    </div>
  );
}
