import type { Task } from "@/lib/types";

export function isTaskDone(task: Task) {
  return (
    task.statusDefinition?.category === "DONE" ||
    ["DONE", "COMPLETED", "CANCELLED"].includes(task.status)
  );
}

export function sortLeadTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return a.createdAt.localeCompare(b.createdAt);
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    const due = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    return due || a.createdAt.localeCompare(b.createdAt);
  });
}

export function formatLeadTaskDue(dueAt: string | null | undefined, now = new Date()) {
  if (!dueAt) return { label: "Sem data", overdue: false, title: "Sem data de vencimento" };
  const due = new Date(dueAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  const label =
    days === 0
      ? "Hoje"
      : days === 1
        ? "Amanhã"
        : new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            ...(due.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
          }).format(due);
  return {
    label,
    overdue: due.getTime() < now.getTime(),
    title: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(due),
  };
}
