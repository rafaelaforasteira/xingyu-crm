"use client";

import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConversationEmptyState({
  className,
  title = "Nenhuma conversa selecionada",
  description = "Selecione uma conversa ao lado para visualizar as mensagens e informações do lead.",
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-1 items-center justify-center bg-white px-6",
        className,
      )}
      data-testid="conversation-empty-state"
    >
      <div className="max-w-[360px] text-center">
        <MessagesSquare
          className="mx-auto h-10 w-10 text-muted-foreground/50"
          aria-hidden
        />
        <h3 className="mt-4 text-base font-medium text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
