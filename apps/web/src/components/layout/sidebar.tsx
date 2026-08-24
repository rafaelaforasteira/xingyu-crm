"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ListChecks, Settings, X, type LucideIcon } from "lucide-react";
import { APP_NAME } from "@xingyu/config";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type NavItem } from "@/lib/nav";
import { isNavActive, extractPipelineIdFromPath } from "@/lib/nav-utils";
import { formatPipelineNavLabel, resolvePipelineIcon } from "@/lib/pipeline-icons";
import { dashboardApi, pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/ui";
import { useAuth } from "@/components/auth/auth-provider";
import { can, canOpenPath } from "@/lib/access-policy";
import { Button } from "@/components/ui/button";
import { SidebarUserIdentity } from "@/components/layout/sidebar-user-identity";

const PIPELINES_HREF = "/pipelines";
const PIPELINES_NAV_STALE_TIME = 3 * 60_000;

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
  count,
  onNavigate,
  onPrefetch,
  testId,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  active: boolean;
  count?: number;
  onNavigate: (href: string) => void;
  onPrefetch: (href: string) => void;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      data-testid={testId}
      onClick={() => onNavigate(href)}
      onMouseEnter={() => onPrefetch(href)}
      onFocus={() => onPrefetch(href)}
      className={cn(
        "flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-white")} />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {count && count > 0 ? (
            <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}

function PipelinesNavSection({
  item,
  collapsed,
  pathname,
  pendingHref,
  onNavigate,
  onPrefetch,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  pendingHref: string | null;
  onNavigate: (href: string) => void;
  onPrefetch: (href: string) => void;
}) {
  const isPipelinesSection = pathname.startsWith(`${PIPELINES_HREF}/`) || pathname === PIPELINES_HREF;
  const [expanded, setExpanded] = React.useState(isPipelinesSection);
  const activePipelineId = extractPipelineIdFromPath(pathname);
  const sectionActive = isNavActive(pathname, PIPELINES_HREF, pendingHref);
  const Icon = item.icon;

  React.useEffect(() => {
    if (isPipelinesSection) setExpanded(true);
  }, [isPipelinesSection]);

  const navigation = useQuery({
    queryKey: queryKeys.pipelines.navigation,
    queryFn: () => pipelinesApi.navigation(),
    staleTime: PIPELINES_NAV_STALE_TIME,
    enabled: expanded || isPipelinesSection,
  });

  if (collapsed) {
    return (
      <Link
        href={PIPELINES_HREF}
        title={item.label}
        aria-current={sectionActive ? "page" : undefined}
        onClick={() => onNavigate(PIPELINES_HREF)}
        onMouseEnter={() => onPrefetch(PIPELINES_HREF)}
        className={cn(
          "flex items-center justify-center rounded-[11px] py-2.5 transition-colors",
          sectionActive ? "bg-white/10 text-white" : "text-sidebar-foreground/75 hover:bg-white/5",
        )}
      >
        <Icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className={cn("flex items-center gap-1 rounded-[11px]", sectionActive && "bg-white/5")}>
        <Link
          href={PIPELINES_HREF}
          onClick={() => onNavigate(PIPELINES_HREF)}
          onMouseEnter={() => onPrefetch(PIPELINES_HREF)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-sm font-medium transition-colors",
            sectionActive ? "text-white" : "text-sidebar-foreground/75 hover:text-white",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Recolher pipelines" : "Expandir pipelines"}
          onClick={() => setExpanded((value) => !value)}
          className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition hover:bg-white/10 hover:text-white"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
          {navigation.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-7 animate-pulse rounded-md bg-white/5" />
              ))
            : null}
          {navigation.data?.map((pipeline) => {
            const href = `/pipelines/${pipeline.id}`;
            const active =
              activePipelineId === pipeline.id ||
              pendingHref === href ||
              pendingHref?.startsWith(`${href}/`) === true;
            const PipelineIcon = resolvePipelineIcon(pipeline.icon);
            const label = formatPipelineNavLabel(
              pipeline.name,
              pipeline.index ?? pipeline.position + 1,
            );
            return (
              <Link
                key={pipeline.id}
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(href)}
                onMouseEnter={() => onPrefetch(href)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold tracking-wide transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-sidebar-foreground/65 hover:bg-white/5 hover:text-white",
                )}
              >
                <PipelineIcon
                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                  style={{ color: pipeline.color ?? undefined }}
                />
                <span className="min-w-0 flex-1 truncate uppercase">{label}</span>
              </Link>
            );
          })}
          <Link
            href={`${PIPELINES_HREF}?view=leads`}
            onClick={() => onNavigate(`${PIPELINES_HREF}?view=leads`)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Todos os leads
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUiStore((s) => s.sidebarMobileOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileOpen = useUiStore((s) => s.setSidebarMobileOpen);

  const counts = useQuery({
    queryKey: queryKeys.dashboard.metrics({ scope: "nav-counts" }),
    queryFn: () => dashboardApi.metrics({ period: "30d" }),
  staleTime: 30_000,
  retry: false,
  enabled: can(user, "dashboard.view"),
  });

  React.useEffect(() => {
    if (
      pendingHref &&
      (pathname === pendingHref || pathname.startsWith(`${pendingHref}/`))
    ) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const handleNavigate = React.useCallback(
    (href: string) => {
      setPendingHref(href);
      setMobileOpen(false);
    },
    [setMobileOpen],
  );

  const handlePrefetch = React.useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  const resolveCount = (item: NavItem) => {
    if (!item.countKey || !counts.data) return undefined;
    if (item.countKey === "openDeals") return counts.data.openDeals;
    if (item.countKey === "waitingConversations") {
      return (
        counts.data.waitingConversations ??
        counts.data.unansweredLeads ??
        counts.data.unreadConversations
      );
    }
    if (item.countKey === "tasksToday") return counts.data.tasksToday;
    return undefined;
  };

  const homeHref = "/pipelines";

  const content = (
    <aside
      data-testid="beta-sidebar"
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-2.5"
          onClick={() => handleNavigate(homeHref)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-soft">
            X
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">{APP_NAME}</p>
              <p className="truncate text-[11px] text-sidebar-muted">Gestão comercial</p>
            </div>
          ) : null}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-7 w-7 shrink-0 text-sidebar-muted hover:bg-white/10 hover:text-white lg:inline-flex"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-muted hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav data-testid="sidebar-navigation" className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => canOpenPath(user, item.href)) })).filter((group) => group.items.length).map((group) => (
          <div key={group.id} className="space-y-1.5">
            {!collapsed ? (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.expandablePipelines) {
                  return (
                    <PipelinesNavSection
                      key={`${group.id}-${item.label}`}
                      item={item}
                      collapsed={collapsed}
                      pathname={pathname}
                      pendingHref={pendingHref}
                      onNavigate={handleNavigate}
                      onPrefetch={handlePrefetch}
                    />
                  );
                }

                const active = item.exact
                  ? pathname === item.href || pendingHref === item.href
                  : isNavActive(pathname, item.href, pendingHref);
                return (
                  <SidebarNavLink
                    key={`${group.id}-${item.href}-${item.label}`}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    collapsed={collapsed}
                    active={active && !item.expandablePipelines}
                    count={resolveCount(item)}
                    onNavigate={handleNavigate}
                    onPrefetch={handlePrefetch}
                    testId={
                      item.href === "/operacao" ? "beta-nav-operation" : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-sidebar-border px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <SidebarNavLink
          href="/settings"
          label="Configurações"
          icon={Settings}
          collapsed={collapsed}
          active={pathname.startsWith("/settings")}
          onNavigate={handleNavigate}
          onPrefetch={handlePrefetch}
          testId="beta-nav-settings"
        />
        <div data-testid="sidebar-user-footer">
          <SidebarUserIdentity
            name={user?.name}
            avatarUrl={user?.avatarUrl}
            collapsed={collapsed}
          />
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">{content}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60 shadow-drawer">{content}</div>
        </div>
      ) : null}
    </>
  );
}
