"use client";

import { Badge } from "@/components/ui/badge";
import { channelName } from "@/lib/inbox-utils";
import type { ConversationChannelSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const channelColors: Record<string, string> = {
  WHATSAPP: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  INSTAGRAM: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  EMAIL: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  SMS: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
};

export function ConversationChannelBadge({
  channel,
  className,
}: {
  channel: ConversationChannelSummary | string | null | undefined;
  className?: string;
}) {
  const label = channelName(channel);
  const type =
    typeof channel === "object" && channel?.type
      ? channel.type.toUpperCase()
      : label.toUpperCase();
  const colorClass = channelColors[type] ?? "bg-muted text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-normal", colorClass, className)}
    >
      {label}
    </Badge>
  );
}
