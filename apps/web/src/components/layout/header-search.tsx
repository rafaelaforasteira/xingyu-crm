"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  BETA_SEARCH_ARIA_LABEL,
  BETA_SEARCH_PLACEHOLDER,
} from "@/lib/beta-config";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

export function HeaderSearch({
  inputRef,
  className,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const [value, setValue] = React.useState(qParam);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    setValue((current) => (current === qParam ? current : qParam));
  }, [qParam]);

  React.useEffect(() => {
    if (!pathname.startsWith("/operacao")) return;
    const trimmed = value.trim();
    const current = qParam.trim();
    if (trimmed === current) return;

    const timer = globalThis.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      if (!params.get("view")) params.set("view", "kanban");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, DEBOUNCE_MS);

    return () => globalThis.clearTimeout(timer);
  }, [pathname, qParam, router, searchParams, value]);

  return (
    <div
      className={cn(
        "relative flex h-9 min-w-0 w-full items-center rounded-lg border border-input bg-background transition",
        focused && "border-primary/60 ring-2 ring-primary/20",
        className,
      )}
      data-testid="beta-header-search"
    >
      <label htmlFor="beta-header-search-input" className="sr-only">
        {BETA_SEARCH_ARIA_LABEL}
      </label>
      <input
        ref={inputRef}
        id="beta-header-search-input"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        placeholder={BETA_SEARCH_PLACEHOLDER}
        aria-label={BETA_SEARCH_ARIA_LABEL}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent py-0 pl-3 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Search
        className={cn(
          "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2",
          focused ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
    </div>
  );
}
