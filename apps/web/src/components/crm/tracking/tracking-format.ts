import { formatCurrency, formatDate } from "@/lib/utils";
export const money = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "—" : formatCurrency(value);
export const integer = (value: number | null) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
export const percentage = (value: number | null) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
export const days = (value: number | null) => (value == null ? "—" : integer(value) + " dias");
export const compactMoney = (value: number | null) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
export const dateBR = (value: string, pattern = "dd/MM/yyyy") => formatDate(value, pattern);
