"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { firstUnlockedPath } from "@/lib/area-locks";

export function LockedArea({ label }: { label: string | null }) {
  const backHref = firstUnlockedPath();
  return (
    <section
      data-testid="locked-area"
      aria-labelledby="locked-area-title"
      className="flex flex-1 items-center justify-center py-16"
    >
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <h1 id="locked-area-title" className="text-lg font-semibold">
          {label ? `Área bloqueada: ${label}` : "Área bloqueada"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Esta área está guardada para as próximas etapas. No momento, apenas Pipelines está
          liberado.
        </p>
        <Link href={backHref} className={buttonVariants({ className: "mt-2" })}>
          Ir para Pipelines
        </Link>
      </div>
    </section>
  );
}
