"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { APP_NAME, DEMO_USER_NAME } from "@xingyu/config";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { useUiStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUiStore((s) => s.sidebarMobileOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileOpen = useUiStore((s) => s.setSidebarMobileOpen);

  const content = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
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
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
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
