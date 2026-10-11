"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

import { canOpenPath } from "@/lib/access-policy";
import { TRACKING_OVERVIEW_PATH } from "@xingyu/config";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = canOpenPath(user, pathname);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    } else if (!isLoading && isAuthenticated && !allowed) {
      router.replace(TRACKING_OVERVIEW_PATH);
    }
  }, [isAuthenticated, isLoading, router, allowed]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando sessão…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecionando para o login…
      </div>
    );
  }

  if (!allowed)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirecionando para Tracking…
      </div>
    );
  return <>{children}</>;
}
