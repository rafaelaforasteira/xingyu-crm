"use client";

import { cn } from "@/lib/utils";

export function MessageSenderLabel({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const label = `Enviado por ${name}`;
  return (
    <p
      className={cn(
        "mb-1 truncate text-[10px] font-medium leading-tight text-muted-foreground/80",
        className,
      )}
      data-testid="message-sender-line"
      title={label}
    >
      {label}
    </p>
  );
}

export function InboundSenderLabel({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-1 truncate text-[10px] font-medium leading-tight text-muted-foreground/80",
        className,
      )}
      data-testid="message-inbound-sender-line"
      title={name}
    >
      {name}
    </p>
  );
}
