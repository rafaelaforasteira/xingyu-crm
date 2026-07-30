import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency = "BRL") {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatDate(value?: string | Date | null, pattern = "dd/MM/yyyy") {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern, { locale: ptBR });
}

export function formatRelative(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

export function formatTaskDue(value?: string | Date | null) {
  if (!value) return "Sem prazo";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (isToday(date)) return `Hoje ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Amanhã ${format(date, "HH:mm")}`;
  return format(date, "dd/MM HH:mm", { locale: ptBR });
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
