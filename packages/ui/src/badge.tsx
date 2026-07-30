import * as React from "react";
import { cn } from "./cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary" }) {
  const { tone = "neutral", ...rest } = props as {
    tone?: string;
  } & React.HTMLAttributes<HTMLSpanElement>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "info" && "bg-sky-50 text-sky-700",
        tone === "primary" && "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
        className,
      )}
      {...rest}
    />
  );
}
