import {
  Handshake,
  Headphones,
  Kanban,
  Rocket,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export const PIPELINE_ICON_MAP: Record<string, LucideIcon> = {
  Kanban,
  ShoppingBag,
  Handshake,
  Rocket,
  Headphones,
};

export function resolvePipelineIcon(icon?: string | null): LucideIcon {
  if (!icon) return Kanban;
  return PIPELINE_ICON_MAP[icon] ?? Kanban;
}

export function formatPipelineNavLabel(name: string, index: number): string {
  const padded = String(index).padStart(2, "0");
  return `${padded}. ${name.trim().toUpperCase()}`;
}
