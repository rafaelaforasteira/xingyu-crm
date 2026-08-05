"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { shouldHideGlobalHeader } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideGlobalHeader = shouldHideGlobalHeader(pathname);

  return (
    <div className="flex min-h-screen bg-background" data-app-shell="true">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {hideGlobalHeader ? null : <Header />}
        <main
          data-testid="app-main"
          data-operation-mode={hideGlobalHeader ? "core" : "default"}
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            hideGlobalHeader
              ? "overflow-hidden p-0"
              : "overflow-auto p-4 sm:p-6",
          )}
        >
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
