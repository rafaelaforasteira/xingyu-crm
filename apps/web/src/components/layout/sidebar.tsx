"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronsLeft, ChevronsRight, Settings, X, type LucideIcon } from "lucide-react";
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
import { isPathUnlocked, LOCKED_AREA_TOOLTIP } from "@/lib/area-locks";

import { LockedSidebarItem } from "./locked-sidebar-item";
import { SidebarTooltip } from "./sidebar-tooltip";
import "./sidebar-shell.css";

const PIPELINES_HREF = "/pipelines";
const PIPELINES_NAV_STALE_TIME = 3 * 60_000;

/** Estilos compartilhados do menu claro (roxo = item ativo). */
const NAV_ITEM_BASE =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
const NAV_ITEM_ACTIVE = "bg-primary/[0.08] text-primary font-semibold";
const NAV_ITEM_IDLE = "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground";
const NAV_SUBITEM_BASE =
  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors";
const NAV_SUBITEM_ACTIVE = "bg-primary/[0.08] text-primary font-semibold";
const NAV_SUBITEM_IDLE = "text-sidebar-muted hover:bg-sidebar-accent hover:text-foreground";
const NAV_EXPAND_BUTTON =
  "mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition hover:bg-sidebar-accent hover:text-foreground";

function NavCount({ count, collapsed }: { count?: number; collapsed: boolean }) {
  if (!count || count <= 0) return null;
  if (collapsed) {
    return (
      <span
        aria-hidden
        className="absolute right-3.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary"
      />
    );
  }
  return (
    <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-md border border-sidebar-border bg-white px-1.5 text-xs font-medium text-sidebar-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

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
    <SidebarTooltip label={label} enabled={collapsed}>
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        data-testid={testId}
        onClick={() => onNavigate(href)}
        onMouseEnter={() => onPrefetch(href)}
        onFocus={() => onPrefetch(href)}
        className={cn(
          NAV_ITEM_BASE,
          "relative",
          active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
          collapsed && "justify-center px-0",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
        <NavCount count={count} collapsed={collapsed} />
      </Link>
    </SidebarTooltip>
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
  const basePath = item.pipelineBasePath ?? PIPELINES_HREF;
  const space = item.pipelineSpace ?? "COMMERCIAL";
  const isPipelinesSection = pathname.startsWith(`${basePath}/`) || pathname === basePath;
  const [expanded, setExpanded] = React.useState(isPipelinesSection);
  const activePipelineId =
    space === "COMMERCIAL"
      ? extractPipelineIdFromPath(pathname)
      : pathname.startsWith(`${basePath}/`)
        ? (pathname.split("/")[2] ?? null)
        : null;
  const sectionActive = isNavActive(pathname, basePath, pendingHref);
  const Icon = item.icon;

  React.useEffect(() => {
    if (isPipelinesSection) setExpanded(true);
  }, [isPipelinesSection]);

  const navigation = useQuery({
    queryKey: [...queryKeys.pipelines.navigation, space],
    queryFn: () => pipelinesApi.navigation(space),
    staleTime: PIPELINES_NAV_STALE_TIME,
    enabled: expanded || isPipelinesSection,
  });

  if (collapsed) {
    return (
      <SidebarTooltip label={item.label} enabled>
        <Link
          href={basePath}
          aria-label={item.label}
          aria-current={sectionActive ? "page" : undefined}
          onClick={() => onNavigate(basePath)}
          onMouseEnter={() => onPrefetch(basePath)}
          className={cn(
            "flex items-center justify-center rounded-xl py-2.5 transition-colors",
            sectionActive ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </Link>
      </SidebarTooltip>
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "flex items-center gap-1 rounded-xl transition-colors",
          sectionActive ? "bg-primary/[0.08]" : "hover:bg-sidebar-accent",
        )}
      >
        <Link
          href={basePath}
          onClick={() => onNavigate(basePath)}
          onMouseEnter={() => onPrefetch(basePath)}
          className={cn(
            NAV_ITEM_BASE,
            "min-w-0 flex-1",
            sectionActive ? "font-semibold text-primary" : "text-sidebar-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Recolher pipelines" : "Expandir pipelines"}
          onClick={() => setExpanded((value) => !value)}
          className={NAV_EXPAND_BUTTON}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-[22px] space-y-0.5 border-l border-sidebar-border pl-2.5">
          {navigation.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-7 animate-pulse rounded-lg bg-sidebar-accent" />
              ))
            : null}
          {navigation.data?.map((pipeline) => {
            const href = `${basePath}/${pipeline.id}`;
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
                className={cn(NAV_SUBITEM_BASE, active ? NAV_SUBITEM_ACTIVE : NAV_SUBITEM_IDLE)}
              >
                <PipelineIcon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: pipeline.color ?? undefined }}
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StaticPipelineNavSection({
  item,
  collapsed,
  pathname,
  currentHref,
  pendingHref,
  onNavigate,
  onPrefetch,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  currentHref: string;
  pendingHref: string | null;
  onNavigate: (href: string) => void;
  onPrefetch: (href: string) => void;
}) {
  const sectionActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const [expanded, setExpanded] = React.useState(sectionActive);
  const [customPipelines, setCustomPipelines] = React.useState<
    Record<string, { name?: string; color?: string }>
  >({});
  const Icon = item.icon;

  React.useEffect(() => {
    if (sectionActive) setExpanded(true);
  }, [sectionActive]);

  React.useEffect(() => {
    const load = () => {
      try {
        setCustomPipelines(JSON.parse(localStorage.getItem("xingyu:journey-pipelines") ?? "{}"));
      } catch {
        setCustomPipelines({});
      }
    };
    load();
    window.addEventListener("xingyu:journey-pipelines-updated", load);
    return () => window.removeEventListener("xingyu:journey-pipelines-updated", load);
  }, []);

  if (collapsed) {
    return (
      <SidebarNavLink
        href={item.href}
        label={item.label}
        icon={Icon}
        collapsed
        active={sectionActive}
        onNavigate={onNavigate}
        onPrefetch={onPrefetch}
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "flex items-center gap-1 rounded-xl transition-colors",
          sectionActive ? "bg-primary/[0.08]" : "hover:bg-sidebar-accent",
        )}
      >
        <Link
          href={item.href}
          onClick={() => onNavigate(item.href)}
          className={cn(
            NAV_ITEM_BASE,
            "min-w-0 flex-1",
            sectionActive ? "font-semibold text-primary" : "text-sidebar-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? `Recolher ${item.label}` : `Expandir ${item.label}`}
          onClick={() => setExpanded((value) => !value)}
          className={NAV_EXPAND_BUTTON}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      {expanded ? (
        <div className="ml-[22px] space-y-0.5 border-l border-sidebar-border pl-2.5">
          {item.children?.map((child) => {
            const active = currentHref === child.href || pendingHref === child.href;
            const ChildIcon = child.icon;
            const config = customPipelines[child.href] ?? {};
            const color = config.color ?? child.color ?? "#8B5CF6";
            const label = config.name ?? child.label;
            const index =
              (item.children?.findIndex((candidate) => candidate.href === child.href) ?? 0) + 1;
            const numberedLabel = `${String(index).padStart(2, "0")}. ${label}`;
            return (
              <Link
                key={child.href}
                href={child.href}
                title={numberedLabel}
                onClick={() => onNavigate(child.href)}
                onMouseEnter={() => onPrefetch(child.href)}
                className={cn(NAV_SUBITEM_BASE, active ? NAV_SUBITEM_ACTIVE : NAV_SUBITEM_IDLE)}
              >
                {ChildIcon ? (
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                )}
                <span className="min-w-0 flex-1 truncate">{numberedLabel}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const storedCollapsed = useUiStore((s) => s.sidebarCollapsed);
  React.useLayoutEffect(() => {
    try {
      useUiStore
        .getState()
        .setSidebarCollapsed(localStorage.getItem("crm.sidebar.collapsed") === "true");
    } catch {
      /* Preserve the default when storage is unavailable. */
    }
  }, []);
  const mobileOpen = useUiStore((s) => s.sidebarMobileOpen);
  const collapsed = storedCollapsed && !mobileOpen;
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
    if (pendingHref && (pathname === pendingHref || pathname.startsWith(`${pendingHref}/`))) {
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

  const homeHref = canOpenPath(user, "/pipelines") ? "/pipelines" : "/tracking/vendas";

  const content = (
    <aside
      data-testid="beta-sidebar"
      data-collapsed={collapsed}
      className={cn(
        "crm-sidebar flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-[240ms] motion-reduce:transition-none",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className="crm-sidebar-brand border-b border-sidebar-border">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-2.5"
          aria-label={collapsed ? "BRAINX" : undefined}
          onClick={() => handleNavigate(homeHref)}
        >
          <img
            src="/brand/brainx-mark.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
            decoding="async"
          />
          {!collapsed ? (
            <p className="truncate text-lg font-bold tracking-tight text-primary">{APP_NAME}</p>
          ) : null}
        </Link>
        <button
          type="button"
          className="crm-sidebar-toggle hidden shrink-0 items-center justify-center transition-colors lg:inline-flex"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label="Fechar menu"
          className="crm-sidebar-toggle inline-flex shrink-0 items-center justify-center transition-colors lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav
        data-testid="sidebar-navigation"
        className="scrollbar-thin min-h-0 flex-1 divide-y divide-sidebar-border overflow-y-auto"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="space-y-2 px-3 py-4">
            {!collapsed ? (
              <p className="px-3 text-[13px] font-medium text-sidebar-muted">{group.label}</p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (!isPathUnlocked(item.href))
                  return (
                    <LockedSidebarItem
                      key={`${group.id}-${item.href}-${item.label}`}
                      label={item.label}
                      icon={item.icon}
                      collapsed={collapsed}
                      tooltipLabel={LOCKED_AREA_TOOLTIP}
                      ariaDescription="área bloqueada nesta etapa"
                    />
                  );
                if (!canOpenPath(user, item.href))
                  return (
                    <LockedSidebarItem
                      key={item.href}
                      label={item.label}
                      icon={item.icon}
                      collapsed={collapsed}
                      tooltipLabel={item.lockedTooltip}
                    />
                  );
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

                if (item.children?.length) {
                  const query = searchParams.toString();
                  return (
                    <StaticPipelineNavSection
                      key={`${group.id}-${item.label}`}
                      item={item}
                      collapsed={collapsed}
                      pathname={pathname}
                      currentHref={`${pathname}${query ? `?${query}` : ""}`}
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
                    testId={item.href === "/operacao" ? "beta-nav-operation" : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-sidebar-border px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {!isPathUnlocked("/settings") ? (
          <LockedSidebarItem
            label="Configurações"
            icon={Settings}
            collapsed={collapsed}
            tooltipLabel={LOCKED_AREA_TOOLTIP}
            ariaDescription="área bloqueada nesta etapa"
          />
        ) : canOpenPath(user, "/settings") ? (
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
        ) : (
          <LockedSidebarItem label="Configurações" icon={Settings} collapsed={collapsed} />
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="crm-sidebar-frame sticky top-0 hidden h-dvh shrink-0 lg:block">{content}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="crm-sidebar-drawer absolute inset-y-0 left-0 flex">{content}</div>
        </div>
      ) : null}
    </>
  );
}
