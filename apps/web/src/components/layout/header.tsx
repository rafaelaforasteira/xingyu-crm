"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  CheckSquare,
  ChevronDown,
  Menu,
  Plus,
  Search,
  Building2,
  UserPlus,
  Kanban,
} from "lucide-react";
import { notificationsApi, tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { BETA_COMING_SOON_MESSAGE, BETA_SINGLE_PIPELINE_MODE } from "@/lib/beta-config";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { HeaderNewMenu } from "@/components/layout/header-new-menu";
import { HeaderSearch } from "@/components/layout/header-search";
import { useUiStore } from "@/stores/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { canOpenPath } from "@/lib/access-policy";
import { HeaderAccountActions } from "@/components/layout/header-account-actions";
import { useAuth } from "@/components/auth/auth-provider";
export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const headerTheme = pathname?.startsWith("/tracking") ? "tracking" : undefined;
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setMobileOpen = useUiStore((s) => s.setSidebarMobileOpen);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [novoOpen, setNovoOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list(),
    enabled: canOpenPath(user, "/notifications"),
    retry: false,
  });

  const { data: tasksToday = [] } = useQuery({
    queryKey: queryKeys.tasks.today,
    queryFn: () => tasksApi.today(),
    enabled: canOpenPath(user, "/tasks"),
    retry: false,
  });

  const unread = notifications.filter((n) => !n.read).length;

  const showComingSoon = React.useCallback(() => {
    toast.message(BETA_COMING_SOON_MESSAGE);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!canOpenPath(user, "/operacao")) return;
        if (BETA_SINGLE_PIPELINE_MODE) {
          searchInputRef.current?.focus();
          return;
        }
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen, user]);

  const todayButton = BETA_SINGLE_PIPELINE_MODE ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 w-9 shrink-0 gap-1.5 px-2 sm:w-[5.25rem] sm:px-3"
      aria-label="Tarefas de hoje"
      data-testid="beta-header-today"
      data-header-control="today"
      onClick={showComingSoon}
    >
      <CheckSquare className="h-4 w-4" />
      <span className="hidden sm:inline">Hoje</span>
    </Button>
  ) : (
    <Link href="/tasks?view=today" className="shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 px-2.5 sm:px-3"
        aria-label="Tarefas de hoje"
        data-header-control="today"
      >
        <CheckSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Hoje</span>
        {tasksToday.length > 0 ? (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {tasksToday.length}
          </Badge>
        ) : null}
      </Button>
    </Link>
  );

  const notificationsButton = (
    <div className="relative shrink-0">
      <Button
        variant="outline"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setNotifOpen((v) => !v)}
        disabled={!canOpenPath(user, "/notifications")}
        aria-label="Notificações"
        data-testid={BETA_SINGLE_PIPELINE_MODE ? "beta-header-notifications" : undefined}
        data-header-control="notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
            data-header-notification-dot=""
          />
        ) : null}
      </Button>
      {notifOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Fechar"
            onClick={() => setNotifOpen(false)}
          />
          <div
            data-header-popover="notifications"
            className="absolute left-0 z-50 mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-card shadow-card sm:left-auto sm:right-0"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold">Notificações</p>
              <Badge variant="secondary">{unread} novas</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </p>
              ) : (
                notifications.slice(0, 12).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "border-b border-border/60 px-3 py-2.5 last:border-0",
                      !n.read && "bg-accent/40",
                    )}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      <ClientRelativeTime value={n.createdAt} />
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  if (BETA_SINGLE_PIPELINE_MODE) {
    return (
      <header
        data-testid="beta-header"
        data-header-theme={headerTheme}
        className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md"
      >
        <div className="flex h-14 w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:grid lg:grid-cols-[minmax(6rem,1fr)_minmax(0,58.625rem)_minmax(6rem,1fr)] lg:px-6">
          <div className="hidden lg:block" aria-hidden />
          <div
            data-header-center-actions
            className="grid min-w-0 flex-1 items-center gap-1.5 sm:gap-3"
            style={{
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
            }}
          >
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              {todayButton}
              {notificationsButton}
            </div>

            <HeaderSearch
              className="max-w-[42.5rem] justify-self-center"
              inputRef={searchInputRef}
              disabled={!canOpenPath(user, "/operacao")}
            />

            <HeaderNewMenu />
          </div>
          <HeaderAccountActions />
        </div>
      </header>
    );
  }

  return (
    <header
      data-testid="global-header"
      data-header-theme={headerTheme}
      className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md"
    >
      <div className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:grid-cols-[minmax(6rem,1fr)_minmax(0,50rem)_minmax(6rem,1fr)] lg:px-6">
        <div className="hidden lg:block" aria-hidden />
        <div
          data-header-center-actions
          className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {todayButton}
            {notificationsButton}
          </div>

          <div className="flex min-w-0 items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-9 w-full max-w-xl min-w-0 items-center gap-2.5 rounded-lg border border-input bg-background/80 px-2.5 text-sm text-muted-foreground transition hover:bg-accent/50 sm:px-3"
              disabled={!canOpenPath(user, "/operacao")}
              aria-label="Buscar no CRM"
              data-header-control="search"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left">
                Buscar contatos, deals, pedidos…
              </span>
              <kbd className="ml-1 hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline">
                ⌘K
              </kbd>
            </button>

            <div className="relative shrink-0">
              <Button
                variant="default"
                size="sm"
                className="gap-1 px-2.5 sm:px-3"
                onClick={() => setNovoOpen((v) => !v)}
                disabled={!canOpenPath(user, "/pipelines")}
                aria-label="Criar novo"
                data-header-control="new"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo</span>
                <ChevronDown className="hidden h-3.5 w-3.5 opacity-80 sm:inline" />
              </Button>
              {novoOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40"
                    aria-label="Fechar"
                    onClick={() => setNovoOpen(false)}
                  />
                  <div
                    data-header-popover="new"
                    className="absolute right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card"
                  >
                    {[
                      { href: "/contacts?new=1", label: "Contato", icon: UserPlus },
                      { href: "/companies?new=1", label: "Empresa", icon: Building2 },
                      { href: "/pipelines", label: "Negócio", icon: Kanban },
                      { href: "/tasks?new=1", label: "Tarefa", icon: CheckSquare },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setNovoOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <item.icon className="h-4 w-4 text-primary" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <HeaderAccountActions />
      </div>
    </header>
  );
}
