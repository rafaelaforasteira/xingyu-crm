"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DealActionItem, Task, Conversation, TeamPerformancePoint } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Briefcase, CheckSquare, MessageCircle, Users } from "lucide-react";
import { priorityLabel, taskStatusLabel } from "@/lib/status-labels";
import { tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function DealsRequiringAction({
  items,
  loading,
}: {
  items: DealActionItem[];
  loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Negócios que exigem ação</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Parados, sem próxima tarefa ou com alto valor em risco
          </p>
        </div>
        <Link href="/pipelines" className="text-sm font-semibold text-primary hover:underline">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Nenhum negócio exige ação agora"
            description="Quando houver negócios parados ou sem próxima atividade, eles aparecem aqui."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-semibold">Cliente</th>
                <th className="pb-2 pr-3 font-semibold">Negócio</th>
                <th className="pb-2 pr-3 font-semibold">Etapa</th>
                <th className="pb-2 pr-3 font-semibold">Sem ação</th>
                <th className="pb-2 pr-3 font-semibold">Valor</th>
                <th className="pb-2 font-semibold">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 8).map((deal) => (
                <tr key={deal.id} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/pipelines/${deal.pipelineId}/deals/${deal.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {deal.contact?.name ?? "Sem contato"}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{deal.reason}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/pipelines/${deal.pipelineId}/deals/${deal.id}`}
                      className="hover:text-primary"
                    >
                      {deal.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">{deal.stage?.name ?? "—"}</td>
                  <td className="py-3 pr-3">{deal.idleDays != null ? `${deal.idleDays}d` : "—"}</td>
                  <td className="py-3 pr-3 font-semibold">{formatCurrency(deal.value)}</td>
                  <td className="py-3">
                    <Badge
                      variant={
                        deal.actionPriority === "HIGH"
                          ? "destructive"
                          : deal.actionPriority === "MEDIUM"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {priorityLabel(deal.actionPriority)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export function TodayTasks({
  today,
  overdue,
  loading,
}: {
  today: Task[];
  overdue: Task[];
  loading?: boolean;
}) {
  const queryClient = useQueryClient();
  const complete = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: async () => {
      toast.success("Tarefa concluída");
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Não foi possível concluir a tarefa"),
  });

  const items = [
    ...overdue.map((task) => ({ task, overdue: true })),
    ...today.map((task) => ({ task, overdue: false })),
  ].slice(0, 8);

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Trabalho de hoje</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Tarefas do dia e atrasadas</p>
        </div>
        <Link href="/tasks?view=today" className="text-sm font-semibold text-primary hover:underline">
          Abrir tarefas
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Nenhuma tarefa para hoje"
            description="Quando houver tarefas com prazo para hoje ou atrasadas, elas aparecem aqui."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          items.map(({ task, overdue: isOverdue }) => {
            const pipelineId = task.pipelineId ?? task.deal?.pipelineId;
            const relatedHref =
              task.dealId && pipelineId
                ? `/pipelines/${pipelineId}/deals/${task.dealId}`
                : task.contactId
                  ? `/contacts/${task.contactId}`
                  : "/tasks";
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-accent"
              >
                <button
                  type="button"
                  title="Marcar como concluída"
                  disabled={complete.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    complete.mutate(task.id);
                  }}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    isOverdue
                      ? "border-destructive text-destructive"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </button>
                <Link href={relatedHref} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {task.contact?.name ?? task.deal?.name ?? "Sem vínculo"} ·{" "}
                    {taskStatusLabel(task.status, isOverdue)}
                  </p>
                </Link>
                <Badge variant={isOverdue ? "destructive" : "secondary"}>
                  {priorityLabel(task.priority)}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function WaitingConversations({
  items,
  loading,
}: {
  items: Conversation[];
  loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Conversas aguardando resposta</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Última mensagem do cliente ainda sem retorno da equipe
          </p>
        </div>
        <Link
          href="/inbox?awaitingReply=1"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Abrir inbox
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhum cliente aguardando"
            description="Quando a última mensagem for do cliente e a equipe ainda não tiver respondido, a conversa aparece aqui — mesmo que já tenha sido lida."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          items.slice(0, 8).map((conversation) => {
            const channelName =
              typeof conversation.channel === "string"
                ? conversation.channel
                : conversation.channel?.name ?? "Canal";
            const preview =
              conversation.lastMessagePreview ??
              conversation.messages?.[0]?.body ??
              "Sem prévia da mensagem";
            const waitingLabel =
              conversation.waitingKindLabel ??
              (conversation.waitingKind === "first_response"
                ? "Aguardando primeira resposta"
                : "Aguardando retorno");
            const duration =
              conversation.waitingDurationLabel ??
              (conversation.waitingMinutes != null
                ? `Aguardando há ${conversation.waitingMinutes}min`
                : null);
            return (
              <Link
                key={conversation.id}
                href={`/inbox/${conversation.id}`}
                className="flex items-start gap-3 rounded-lg px-1 py-2.5 hover:bg-accent"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10 text-[10px] font-bold text-info">
                  {channelName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {conversation.contact?.name ?? "Contato"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {channelName} · “{preview}”
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-foreground/80">
                    {waitingLabel}
                    {duration ? ` · ${duration}` : ""}
                    {(conversation.unreadCount ?? 0) > 0 ? " · Não lida" : " · Lida"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function TeamPerformance({
  items,
  loading,
  visible,
}: {
  items: TeamPerformancePoint[];
  loading?: boolean;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Desempenho da equipe</CardTitle>
        <p className="text-xs text-muted-foreground">
          Identifique sobrecarga, pendências e necessidade de suporte
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sem dados de equipe"
            description="Quando houver responsáveis com negócios e tarefas, o panorama aparece aqui."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-semibold">Responsável</th>
                <th className="pb-2 pr-3 font-semibold">Negócios</th>
                <th className="pb-2 pr-3 font-semibold">Receita</th>
                <th className="pb-2 pr-3 font-semibold">Conversão</th>
                <th className="pb-2 pr-3 font-semibold">Ticket</th>
                <th className="pb-2 pr-3 font-semibold">Atrasadas</th>
                <th className="pb-2 font-semibold">Aguardando</th>
              </tr>
            </thead>
            <tbody>
              {items.map((member) => (
                <tr key={member.id} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={member.name} size="sm" />
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">{member.openDeals}</td>
                  <td className="py-3 pr-3 font-semibold">{formatCurrency(member.revenue)}</td>
                  <td className="py-3 pr-3">
                    {member.conversionRate != null
                      ? `${member.conversionRate}%`
                      : "Dados indisponíveis"}
                  </td>
                  <td className="py-3 pr-3">{formatCurrency(member.averageTicket)}</td>
                  <td className="py-3 pr-3">{member.overdueTasks}</td>
                  <td className="py-3">{member.waitingConversations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
