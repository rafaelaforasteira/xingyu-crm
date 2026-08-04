"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES: { id: string; label: string; emojis: string[] }[] = [
  {
    id: "faces",
    label: "Rostos",
    emojis: ["😀", "😁", "😂", "😊", "😍", "🤔", "😮", "😢", "😎", "🙂"],
  },
  {
    id: "gestures",
    label: "Gestos",
    emojis: ["👍", "👎", "👏", "🙏", "👋", "🤝", "✌️", "👌", "💪", "🙌"],
  },
  {
    id: "hearts",
    label: "Coração",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💖"],
  },
  {
    id: "celebration",
    label: "Comemoração",
    emojis: ["🎉", "🎊", "🥳", "✨", "🎈", "🍾", "🏆", "🥇", "🔥", "⭐"],
  },
  {
    id: "work",
    label: "Trabalho",
    emojis: ["💼", "📁", "📝", "📅", "✅", "📌", "🗂️", "🖥️", "📞", "💬"],
  },
  {
    id: "money",
    label: "Dinheiro",
    emojis: ["💰", "💵", "💳", "🧾", "📈", "📉", "🏦", "🪙", "💲", "💱"],
  },
  {
    id: "orders",
    label: "Pedidos",
    emojis: ["🛒", "🛍️", "📦", "🏷️", "📋", "✍️", "🔔", "⏳", "🕒", "🆗"],
  },
  {
    id: "delivery",
    label: "Entrega",
    emojis: ["🚚", "✈️", "🏠", "📍", "🗺️", "📬", "📭", "🚪", "🔑", "🎁"],
  },
];

export function ConversationEmojiPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Seletor de emoji"
      data-testid="emoji-popover"
      className={cn(
        "absolute bottom-full left-0 z-40 mb-2 max-h-64 w-[min(100vw-2rem,20rem)] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg",
      )}
    >
      {EMOJI_CATEGORIES.map((category) => (
        <div key={category.id} className="mb-2 last:mb-0">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {category.label}
          </p>
          <div className="grid grid-cols-8 gap-0.5">
            {category.emojis.map((emoji) => (
              <button
                key={`${category.id}-${emoji}`}
                type="button"
                className="rounded-md p-1.5 text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelect(emoji)}
                aria-label={`Inserir emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
