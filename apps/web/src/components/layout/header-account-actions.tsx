"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function HeaderAccountActions() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = React.useState(false);

  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 pl-2 sm:pl-4" data-header-account>
      <span className="group relative inline-flex">
        <Link
          href="/settings/general"
          aria-label="Meu perfil"
          aria-describedby="header-profile-tip"
          data-header-control="avatar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
        >
          <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
        </Link>
        <span
          id="header-profile-tip"
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground shadow-card group-hover:block group-focus-within:block"
        >
          Meu perfil
        </span>
      </span>
      <span className="group relative inline-flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sair"
          aria-describedby="header-logout-tip"
          data-header-control="logout"
          disabled={loggingOut}
          className="h-9 w-9 text-muted-foreground hover:bg-destructive/5 hover:text-destructive focus-visible:ring-primary/55"
          onClick={async () => {
            setLoggingOut(true);
            try {
              await logout();
            } finally {
              setLoggingOut(false);
            }
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
        <span
          id="header-logout-tip"
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground shadow-card group-hover:block group-focus-within:block"
        >
          Sair
        </span>
      </span>
    </div>
  );
}
