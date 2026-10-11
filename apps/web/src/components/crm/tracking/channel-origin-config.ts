import type { LucideIcon } from "lucide-react";
import { Camera, HelpCircle, Layers, Mail, MousePointerClick, Users } from "lucide-react";
import type { TrackingChannel } from "./tracking-analytics-types";

/**
 * Primary acquisition channels for Tracking > Visão Geral.
 * One sale has one origin here. Placements (Instagram ad vs organic profile,
 * WhatsApp as a later touchpoint) are not extra rows in this view.
 */
export type ChannelConfig = {
  id: string;
  label: string;
  color: string;
  asset?: string;
  /** Asset was exported on an opaque black matte. */
  matte?: "dark";
  fallback: LucideIcon;
};

export const CHANNEL_CONFIG: Record<TrackingChannel, ChannelConfig> = {
  META_ADS: {
    id: "meta_ads",
    label: "Meta Ads",
    color: "hsl(var(--info))",
    asset: "/brands/meta.png",
    matte: "dark",
    fallback: Layers,
  },
  INSTAGRAM: {
    id: "instagram",
    label: "Instagram",
    color: "hsl(329 62% 46%)",
    asset: "/brands/instagram.png",
    fallback: Camera,
  },
  WHATSAPP: {
    id: "whatsapp",
    label: "WhatsApp",
    color: "hsl(var(--success))",
    asset: "/brands/whatsapp.webp",
    matte: "dark",
    fallback: Layers,
  },
  GOOGLE_ADS: {
    id: "google_ads",
    label: "Google Ads",
    color: "hsl(var(--warning))",
    asset: "/brands/google-ads.webp",
    fallback: Layers,
  },
  REFERRAL: {
    id: "referral",
    label: "Indicação",
    color: "var(--tracking-chart-muted)",
    fallback: Users,
  },
  EMAIL: {
    id: "email",
    label: "E-mail",
    color: "var(--tracking-fg-muted)",
    fallback: Mail,
  },
  DIRECT: {
    id: "direct",
    label: "Direto",
    color: "hsl(var(--muted-foreground))",
    fallback: MousePointerClick,
  },
  OTHER: {
    id: "other",
    label: "Outros",
    color: "var(--tracking-chart-muted)",
    fallback: Layers,
  },
  UNIDENTIFIED: {
    id: "unidentified",
    label: "Não identificado",
    color: "hsl(250 8% 62%)",
    fallback: HelpCircle,
  },
};

export const CHANNEL_LABELS = Object.fromEntries(
  Object.entries(CHANNEL_CONFIG).map(([channel, config]) => [channel, config.label]),
) as Record<TrackingChannel, string>;

export const CHANNEL_COLORS = Object.fromEntries(
  Object.entries(CHANNEL_CONFIG).map(([channel, config]) => [channel, config.color]),
) as Record<TrackingChannel, string>;

export const CHANNEL_HELP: Record<TrackingChannel, string> = {
  META_ADS: "Receita líquida atribuída a anúncios pagos da Meta no período selecionado.",
  WHATSAPP: "Receita líquida em que o WhatsApp foi a origem registrada no período selecionado.",
  GOOGLE_ADS: "Receita líquida atribuída a anúncios de pesquisa do Google no período selecionado.",
  INSTAGRAM: "Receita líquida de origem orgânica do Instagram no período selecionado.",
  REFERRAL: "Receita líquida atribuída a indicações no período selecionado.",
  EMAIL: "Receita líquida atribuída a e-mail no período selecionado.",
  DIRECT: "Receita líquida de acesso direto no período selecionado.",
  OTHER: "Receita líquida de origens conhecidas fora dos canais principais, no período selecionado.",
  UNIDENTIFIED: "Receita líquida do período selecionado sem uma origem identificada.",
};
