"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
  size = "md",
  alt,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "list" | "profile";
  alt?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const sizeClass =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "lg"
        ? "h-10 w-10 text-sm"
        : size === "profile"
          ? "h-16 w-16 text-lg sm:h-[4.5rem] sm:w-[4.5rem]"
        : size === "list"
          ? "h-9 w-9 text-[11px]"
          : "h-8 w-8 text-xs";

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? name ?? ""}
        className={cn("shrink-0 rounded-full object-cover", sizeClass, className)}
        onError={() => setFailed(true)}
      />
    );
  }

  const label = initials(name);
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary",
        sizeClass,
        className,
      )}
      title={name ?? undefined}
      aria-hidden={name ? undefined : true}
    >
      {label}
    </div>
  );
}
