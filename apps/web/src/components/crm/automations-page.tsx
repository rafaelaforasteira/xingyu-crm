"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { automationsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatRelative } from "@/lib/utils";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label, Select } from "@/components/ui/form-controls";
import type { Automation } from "@/lib/types";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "outline"> = {
  ACTIVE: "success",
  DRAFT: "secondary",
  PAUSED: "warning",
};

export function AutomationsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.automations.all,
    queryFn: () => automationsApi.list(),
    retry: false,
  });

  return (
    <div>
      <PageHeader
        title="Automações"
        description="Fluxos de follow-up, recompra e pós-venda."
        actions={
          <Link href="/automations/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nova automação
            </Button>
          </Link>
        }
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Nenhuma automação"
          description="Crie a primeira automação para disparar ações."
          actionLabel="Nova automação"
          onAction={() => router.push("/automations/new")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((a) => (
            <Link key={a.id} href={`/automations/${a.id}`}>
              <Card className="h-full transition hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span>{a.name}</span>
                    <Badge variant={STATUS_VARIANT[a.status] ?? "outline"}>{a.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {a.description || a.trigger || "Sem descrição"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Atualizada {formatRelative(a.updatedAt ?? a.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AutomationNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [trigger, setTrigger] = React.useState("DEAL_STAGE_CHANGED");

  const create = useMutation({
    mutationFn: () =>
      automationsApi.create({
        name,
        description,
        trigger,
        status: "DRAFT",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
      toast.success("Automação criada");
      router.push(`/automations/${created.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Nova automação"
        description="Defina o gatilho e salve como rascunho."
        actions={
          <Link href="/automations" className="text-sm text-primary hover:underline">
            Voltar
          </Link>
        }
      />
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Follow-up após proposta"
            />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que esta automação faz?"
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label>Gatilho</Label>
            <Select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              <option value="DEAL_STAGE_CHANGED">Mudança de estágio</option>
              <option value="TASK_OVERDUE">Tarefa atrasada</option>
              <option value="ORDER_DELIVERED">Pedido entregue</option>
              <option value="REPURCHASE_READY">Pronto para recompra</option>
              <option value="INACTIVITY">Inatividade</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/automations")}>
              Cancelar
            </Button>
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Criar rascunho
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AutomationDetailPage({ automationId }: { automationId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.automations.detail(automationId),
    queryFn: () => automationsApi.get(automationId),
    retry: false,
  });

  const [draft, setDraft] = React.useState<Partial<Automation>>({});

  React.useEffect(() => {
    if (data) {
      setDraft({
        name: data.name,
        description: data.description ?? "",
        status: data.status,
        trigger: data.trigger,
      });
    }
  }, [data]);

  const update = useMutation({
    mutationFn: () => automationsApi.update(automationId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.detail(automationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
      toast.success("Automação atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error || !data) {
    return (
      <ErrorBanner message={(error as Error)?.message ?? "Automação não encontrada"} />
    );
  }

  const nodes = data.nodes ?? [];

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.trigger || "Automação"}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[data.status] ?? "outline"}>{data.status}</Badge>
            <Link href="/automations" className="text-sm text-primary hover:underline">
              Lista
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={draft.name ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={String(draft.status ?? "DRAFT")}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
              >
                <option value="DRAFT">Rascunho</option>
                <option value="ACTIVE">Ativa</option>
                <option value="PAUSED">Pausada</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Gatilho</Label>
              <Input
                value={draft.trigger ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, trigger: e.target.value }))}
              />
            </div>
            <Button disabled={update.isPending} onClick={() => update.mutate()}>
              Salvar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fluxo ({nodes.length} nós)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nodes.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="Sem nós"
                description="A API ainda não retornou etapas deste fluxo."
                className="border-0 bg-transparent"
              />
            ) : (
              nodes
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((node, idx) => (
                  <div
                    key={node.id}
                    className="flex items-start gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{node.label}</p>
                      <p className="text-xs text-muted-foreground">{node.type}</p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
