"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Kanban, X, type LucideIcon } from "lucide-react";
import { APP_NAME, DEMO_USER_NAME } from "@xingyu/config";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { isNavActive, extractPipelineIdFromPath } from "@/lib/nav-utils";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

const PIPELINES_HREF = "/pipelines";
const PIPELINES_NAV_STALE_TIME = 3 * 60_000;

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
  onNavigate,
  onPrefetch,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  active: boolean;
  onNavigate: (href: string) => void;
  onPrefetch: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      onClick={() => onNavigate(href)}
      onMouseEnter={() => onPrefetch(href)}
      onFocus={() => onPrefetch(href)}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

function PipelinesNavSection({
  collapsed,
  pathname,
  pendingHref,
  onNavigate,
  onPrefetch,
}: {
  collapsed: boolean;
  pathname: string;
  pendingHref: string | null;
  onNavigate: (href: string) => void;
  onPrefetch: (href: string) => void;
}) {
  const pipelinesItem = NAV_ITEMS.find((item) => item.href === PIPELINES_HREF);
  const isPipelinesSection = pathname.startsWith(`${PIPELINES_HREF}/`) || pathname === PIPELINES_HREF;
  const [expanded, setExpanded] = React.useState(isPipelinesSection);
  const activePipelineId = extractPipelineIdFromPath(pathname);
  const sectionActive = isNavActive(pathname, PIPELINES_HREF, pendingHref);

  React.useEffect(() => {
    if (isPipelinesSection) setExpanded(true);
  }, [isPipelinesSection]);

  const navigation = useQuery({
    queryKey: queryKeys.pipelines.navigation,
    queryFn: () => pipelinesApi.navigation(),
    staleTime: PIPELINES_NAV_STALE_TIME,
    enabled: expanded || isPipelinesSection,
  });

  if (!pipelinesItem) return null;

  const Icon = pipelinesItem.icon;

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        <Link
          href={PIPELINES_HREF}
          title={pipelinesItem.label}
          aria-current={sectionActive ? "page" : undefined}
          onClick={() => onNavigate(PIPELINES_HREF)}
          onMouseEnter={() => onPrefetch(PIPELINES_HREF)}
          onFocus={() => onPrefetch(PIPELINES_HREF)}
          className={cn(
            "flex items-center justify-center rounded-lg px-0 py-2 text-sm font-medium transition-colors",
            sectionActive
              ? "bg-sidebar-accent text-primary"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-foreground",
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", sectionActive && "text-primary")} />
        </Link>
        {navigation.data?.length ? (
          <div
            className="space-y-0.5"
            role="menu"
            aria-label="Pipelines"
          >
            {navigation.data.map((pipeline) => {
              const href = `/pipelines/${pipeline.id}`;
              const active =
                activePipelineId === pipeline.id ||
                pendingHref === href ||
                pendingHref?.startsWith(`${href}/`) === true;
              return (
                <Link
                  key={pipeline.id}
                  href={href}
                  title={pipeline.name}
                  role="menuitem"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(href)}
                  onMouseEnter={() => onPrefetch(href)}
                  onFocus={() => onPrefetch(href)}
                  className={cn(
                    "mx-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    active
                      ? "bg-sidebar-accent ring-1 ring-primary/30"
                      : "hover:bg-sidebar-accent/70",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: pipeline.color ?? "#7c3aed" }}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg pr-1",
          sectionActive && "bg-sidebar-accent/40",
        )}
      >
        <Link
          href={PIPELINES_HREF}
          aria-current={pathname === PIPELINES_HREF && pendingHref == null ? "page" : undefined}
          onClick={() => onNavigate(PIPELINES_HREF)}
          onMouseEnter={() => onPrefetch(PIPELINES_HREF)}
          onFocus={() => onPrefetch(PIPELINES_HREF)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
            sectionActive
              ? "text-primary"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-foreground",
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", sectionActive && "text-primary")} />
          <span className="truncate">{pipelinesItem.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Recolher pipelines" : "Expandir pipelines"}
          onClick={() => setExpanded((value) => !value)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-sidebar-accent/70 hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 space-y-0.5 border-l border-sidebar-border pl-2">
          {navigation.isLoading ? (
            <div className="space-y-1 px-2.5 py-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-7 animate-pulse rounded-md bg-sidebar-accent/50" />
              ))}
            </div>
          ) : null}
          {navigation.data?.map((pipeline) => {
            const href = `/pipelines/${pipeline.id}`;
            const active =
              activePipelineId === pipeline.id ||
              pendingHref === href ||
              pendingHref?.startsWith(`${href}/`) === true;
            return (
              <Link
                key={pipeline.id}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(href)}
                onMouseEnter={() => onPrefetch(href)}
                onFocus={() => onPrefetch(href)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-foreground",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: pipeline.color ?? "#7c3aed" }}
                  aria-hidden
                />
                <span className="truncate">{pipeline.name}</span>
                {pipeline.unreadCount ? (
                  <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {pipeline.unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <Link
            href={PIPELINES_HREF}
            onClick={() => onNavigate(PIPELINES_HREF)}
            onMouseEnter={() => onPrefetch(PIPELINES_HREF)}
            onFocus={() => onPrefetch(PIPELINES_HREF)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-foreground",
              pathname === PIPELINES_HREF && pendingHref == null && "text-primary",
            )}
          >
            <Kanban className="h-3.5 w-3.5" />
            Ver todos
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUiStore((s) => s.sidebarMobileOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileOpen = useUiStore((s) => s.setSidebarMobileOpen);

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

  const content = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5"
          onClick={() => {
            handleNavigate("/dashboard");
          }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            X
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{APP_NAME}</p>
              <p className="truncate text-[11px] text-muted-foreground">Operação comercial</p>
            </div>
          ) : null}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-7 w-7 shrink-0 lg:inline-flex"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          if (item.href === PIPELINES_HREF) {
            return (
              <PipelinesNavSection
                key={item.href}
                collapsed={collapsed}
                pathname={pathname}
                pendingHref={pendingHref}
                onNavigate={handleNavigate}
                onPrefetch={handlePrefetch}
              />
            );
          }

          const active = isNavActive(pathname, item.href, pendingHref);
          return (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              active={active}
              onNavigate={handleNavigate}
              onPrefetch={handlePrefetch}
            />
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <Avatar name={DEMO_USER_NAME} size="sm" />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{DEMO_USER_NAME}</p>
              <p className="truncate text-[11px] text-muted-foreground">Administradora</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden h-screen shrink-0 lg:block">{content}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/30"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60 shadow-drawer">{content}</div>
        </div>
      ) : null}
    </>
  );
}
