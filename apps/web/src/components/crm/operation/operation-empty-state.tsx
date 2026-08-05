"use client";

import { useRouter } from "next/navigation";
import { Kanban } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function OperationEmptyState() {
  const router = useRouter();
  return (
    <EmptyState
      icon={Kanban}
      title="Nenhum pipeline ativo"
      description="Crie ou ative um pipeline nas configurações para começar a operação comercial."
      className="m-auto max-w-lg"
      actionLabel="Abrir configuração"
      onAction={() => router.push("/settings/pipelines")}
    />
  );
}
