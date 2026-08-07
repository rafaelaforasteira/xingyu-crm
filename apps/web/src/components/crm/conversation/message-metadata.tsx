"use client";

import { cn } from "@/lib/utils";
import type { NormalizedDeliveryStatus } from "./message-content-utils";
import { MessageDeliveryStatus } from "./message-delivery-status";
import {
  formatMessageClock,
  formatMessageFullDateTime,
} from "./message-time-utils";

export function MessageMetadata({
  createdAt,
  direction,
  status,
  mounted,
  className,
}: {
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  status?: NormalizedDeliveryStatus | null;
  mounted: boolean;
  className?: string;
}) {
  const clock = mounted ? formatMessageClock(createdAt) : "";
  const full = mounted ? formatMessageFullDateTime(createdAt) : "";
  const showStatus =
    direction === "OUTBOUND" && status != null && status !== undefined;

  return (
    <div
      className={cn(
        "mt-1 flex items-center justify-end gap-1 text-[10px] leading-none text-muted-foreground/80",
        className,
      )}
      data-testid="message-metadata"
    >
      <time
        dateTime={createdAt}
        title={full || undefined}
        aria-label={full ? `Enviada em ${full}` : undefined}
        data-testid="message-time"
        className="tabular-nums"
      >
        {clock || "··"}
      </time>
      {showStatus ? (
        <MessageDeliveryStatus status={status} fullDateTime={full} />
      ) : null}
    </div>
  );
}
