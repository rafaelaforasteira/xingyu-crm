import * as React from "react";
import { cn } from "./cn";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-6 py-16 text-center",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
