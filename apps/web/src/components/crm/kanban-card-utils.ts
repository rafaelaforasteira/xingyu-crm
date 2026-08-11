import type { Deal, Tag } from "@/lib/types";

export type TaskAttention = "none" | "future" | "today" | "overdue";

export function taskAttention(summary?: Deal["taskSummary"]): TaskAttention {
  if (!summary?.open) return "none";
  if (summary.overdue > 0) return "overdue";
  if (summary.today > 0) return "today";
  return "future";
}

export function taskTooltip(summary?: Deal["taskSummary"]): string {
  if (!summary?.open) return "Nenhuma tarefa aberta";
  const parts = [
    `${summary.open} tarefa${summary.open === 1 ? "" : "s"} aberta${summary.open === 1 ? "" : "s"}`,
  ];
  if (summary.overdue) parts.push(`${summary.overdue} atrasada${summary.overdue === 1 ? "" : "s"}`);
  if (summary.today) parts.push(`${summary.today} para hoje`);
  return parts.join(" · ");
}

export function visibleCardChips(channelName: string | null, tags: Tag[] = []) {
  const deduped = tags.filter(
    (tag, index) => tags.findIndex((item) => item.id === tag.id) === index,
  );
  const withoutChannel = channelName
    ? deduped.filter(
        (tag) => tag.name.localeCompare(channelName, "pt-BR", { sensitivity: "base" }) !== 0,
      )
    : deduped;
  const entries = [
    ...(channelName ? [{ id: "channel", name: channelName, channel: true }] : []),
    ...withoutChannel.map((tag) => ({ ...tag, channel: false })),
  ];
  return { visible: entries.slice(0, 2), overflow: entries.slice(2) };
}
