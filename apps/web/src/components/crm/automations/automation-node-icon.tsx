import {
  Bell,
  CheckCheck,
  CheckSquare,
  CircleDollarSign,
  CircleOff,
  CircleStop,
  Clock3,
  Contact,
  Copy,
  Dices,
  Filter,
  GitBranch,
  GitFork,
  Globe,
  Hourglass,
  ListChecks,
  ListTree,
  Merge,
  MessageCircle,
  MoveRight,
  OctagonX,
  Package,
  PackageCheck,
  Play,
  Plug,
  Repeat,
  Search,
  Sparkles,
  Split,
  Square,
  StickyNote,
  Tag,
  Unplug,
  UserRoundCog,
  Variable,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NODE_ICONS: Record<string, LucideIcon> = {
  bell: Bell,
  "check-check": CheckCheck,
  "check-square": CheckSquare,
  "circle-dollar-sign": CircleDollarSign,
  "circle-off": CircleOff,
  "circle-stop": CircleStop,
  "clock-3": Clock3,
  contact: Contact,
  copy: Copy,
  dices: Dices,
  filter: Filter,
  "git-branch": GitBranch,
  "git-fork": GitFork,
  globe: Globe,
  hourglass: Hourglass,
  "list-checks": ListChecks,
  "list-tree": ListTree,
  merge: Merge,
  "message-circle": MessageCircle,
  "move-right": MoveRight,
  "octagon-x": OctagonX,
  package: Package,
  "package-check": PackageCheck,
  play: Play,
  plug: Plug,
  repeat: Repeat,
  search: Search,
  sparkles: Sparkles,
  split: Split,
  square: Square,
  "sticky-note": StickyNote,
  tag: Tag,
  unplug: Unplug,
  "user-round-cog": UserRoundCog,
  variable: Variable,
  webhook: Webhook,
};

export const AUTOMATION_CATEGORY_META: Record<
  string,
  { label: string; accent: string; surface: string }
> = {
  triggers: { label: "Gatilhos", accent: "text-violet-400", surface: "bg-violet-500/12" },
  logic: { label: "Lógica", accent: "text-sky-400", surface: "bg-sky-500/12" },
  time: { label: "Tempo", accent: "text-amber-400", surface: "bg-amber-500/12" },
  data: { label: "Dados", accent: "text-cyan-400", surface: "bg-cyan-500/12" },
  crm: { label: "CRM", accent: "text-fuchsia-400", surface: "bg-fuchsia-500/12" },
  communication: {
    label: "Comunicação",
    accent: "text-emerald-400",
    surface: "bg-emerald-500/12",
  },
  advanced: { label: "Avançado", accent: "text-orange-400", surface: "bg-orange-500/12" },
  visual: { label: "Organização", accent: "text-slate-400", surface: "bg-slate-500/12" },
};

export function AutomationNodeIcon({
  icon,
  category,
  className,
}: {
  icon?: string;
  category?: string;
  className?: string;
}) {
  const Icon = NODE_ICONS[icon ?? ""] ?? Sparkles;
  const meta = AUTOMATION_CATEGORY_META[category ?? ""] ?? AUTOMATION_CATEGORY_META.triggers!;
  return <Icon className={cn("h-4 w-4", meta.accent, className)} aria-hidden="true" />;
}
