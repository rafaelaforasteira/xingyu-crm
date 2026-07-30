"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { DEMO_USER_NAME } from "@xingyu/config";
import { notificationsApi, settingsApi, tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { useUiStore } from "@/stores/ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Header() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setMobileOpen = useUiStore((s) => s.setSidebarMobileOpen);
  const selectedTeamId = useUiStore((s) => s.selectedTeamId);
  const setSelectedTeamId = useUiStore((s) => s.setSelectedTeamId);

  const [novoOpen, setNovoOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [teamOpen, setTeamOpen] = React.useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list(),
    retry: false,
  });

  const { data: tasksToday = [] } = useQuery({
    queryKey: queryKeys.tasks.today,
    queryFn: () => tasksApi.today(),
    retry: false,
  });

  const { data: settings } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    retry: false,
  });

  const unread = notifications.filter((n) => !n.read).length;
  const teams = settings?.teams ?? [{ id: "team-gestao", name: "Gestão" }];
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? teams[0];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/80 bg-card/90 px-3 backdrop-blur-md sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-background/80 px-3 text-sm text-muted-foreground transition hover:bg-accent/50 sm:max-w-md"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Buscar contatos, deals, pedidos…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="relative">
        <Button variant="default" size="sm" onClick={() => setNovoOpen((v) => !v)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>
        {novoOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Fechar"
              onClick={() => setNovoOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card">
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

      <Link href="/tasks?view=today">
        <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex">
          <CheckSquare className="h-4 w-4" />
          Hoje
          {tasksToday.length > 0 ? (
            <Badge variant="secondary">{tasksToday.length}</Badge>
          ) : null}
        </Button>
      </Link>

      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setNotifOpen((v) => !v)}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
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
            <div className="absolute right-0 z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
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

      <div className="relative hidden sm:block">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTeamOpen((v) => !v)}
          className="gap-1.5"
        >
          {selectedTeam?.name ?? "Equipe"}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        {teamOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Fechar"
              onClick={() => setTeamOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm hover:bg-accent",
                    team.id === selectedTeamId && "bg-accent text-primary",
                  )}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setTeamOpen(false);
                  }}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="hidden items-center gap-2 border-l border-border pl-2 md:flex">
        <Avatar name={DEMO_USER_NAME} size="sm" />
        <div className="leading-tight">
          <p className="text-sm font-medium">{DEMO_USER_NAME}</p>
          <p className="text-[11px] text-muted-foreground">Demo</p>
        </div>
      </div>
    </header>
  );
}
