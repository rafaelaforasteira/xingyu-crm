"use client";

import type { ReactNode } from "react";
import {
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deliveryStatusAriaLabel,
  type NormalizedDeliveryStatus,
} from "./message-content-utils";

export function MessageDeliveryStatus({
  status,
  fullDateTime,
  className,
}: {
  status: NormalizedDeliveryStatus;
  fullDateTime?: string | null;
  className?: string;
}) {
  const label = deliveryStatusAriaLabel(status, fullDateTime);
  const iconClass = "h-3.5 w-3.5 shrink-0";

  let icon: ReactNode;
  let tone = "text-muted-foreground/80";

  switch (status) {
    case "SENDING":
      icon = <Loader2 className={cn(iconClass, "animate-spin")} aria-hidden />;
      break;
    case "SENT":
      icon = <Check className={iconClass} aria-hidden />;
      break;
    case "DELIVERED":
      icon = <CheckCheck className={iconClass} aria-hidden />;
      break;
    case "READ":
      icon = <CheckCheck className={iconClass} aria-hidden />;
      tone = "text-primary";
      break;
    case "FAILED":
      icon = <CircleAlert className={iconClass} aria-hidden />;
      tone = "text-destructive";
      break;
    default:
      icon = <Clock3 className={iconClass} aria-hidden />;
  }

  return (
    <span
      className={cn("inline-flex items-center", tone, className)}
      data-testid="message-delivery-status"
      data-status={status}
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
