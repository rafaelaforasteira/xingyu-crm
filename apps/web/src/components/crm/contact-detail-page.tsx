"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";

export function ContactDetailPage({ contactId }: { contactId: string }) {
  const contact = useQuery({
    queryKey: queryKeys.contacts.detail(contactId),
    queryFn: () => contactsApi.get(contactId),
    retry: false,
  });
  const activities = useQuery({
    queryKey: queryKeys.contacts.activities(contactId),
    queryFn: () => contactsApi.activities(contactId),
    retry: false,
  });
  const deals = useQuery({
    queryKey: ["contacts", contactId, "deals"],
    queryFn: () => contactsApi.deals(contactId),
    retry: false,
  });
  const orders = useQuery({
    queryKey: ["contacts", contactId, "orders"],
    queryFn: () => contactsApi.orders(contactId),
    retry: false,
  });
  const tasks = useQuery({
    queryKey: ["contacts", contactId, "tasks"],
    queryFn: () => contactsApi.tasks(contactId),
    retry: false,
  });

  if (contact.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (contact.isError || !contact.data) {
    return (
      <ErrorBanner
        message={(contact.error as Error)?.message ?? "Contato não encontrado"}
      />
    );
  }

  const c = contact.data;

  return (
    <div>
      <PageHeader
        title={c.name}
        description={[c.email, c.phone, c.company?.name].filter(Boolean).join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <Avatar name={c.name} size="lg" />
            {c.status ? <Badge>{c.status}</Badge> : null}
          </div>
        }
      />

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="deals">Negócios</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="info">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-2">
          {(activities.data ?? []).length === 0 ? (
            <EmptyState title="Sem atividades" description="A timeline deste contato está vazia." />
          ) : (
            (activities.data ?? []).map((a) => (
              <Card key={a.id}>
                <CardContent className="py-3">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.description ? (
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    <ClientRelativeTime value={a.createdAt} />
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="deals" className="space-y-2">
          {(deals.data ?? []).map((d) => (
            <Link
              key={d.id}
              href={`/pipelines/${d.pipelineId}/deals/${d.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent"
            >
              <span className="font-medium">{d.name}</span>
              <span className="text-sm text-primary">{formatCurrency(d.value ?? 0)}</span>
            </Link>
          ))}
          {(deals.data ?? []).length === 0 ? (
            <EmptyState title="Sem negócios" />
          ) : null}
        </TabsContent>

        <TabsContent value="orders" className="space-y-2">
          {(orders.data ?? []).map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent"
            >
              <span className="font-medium">#{o.number}</span>
              <Badge variant="secondary">{o.status}</Badge>
            </Link>
          ))}
          {(orders.data ?? []).length === 0 ? <EmptyState title="Sem pedidos" /> : null}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {(tasks.data ?? []).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="font-medium">{t.title}</span>
              <Badge variant="outline">{t.status}</Badge>
            </div>
          ))}
          {(tasks.data ?? []).length === 0 ? <EmptyState title="Sem tarefas" /> : null}
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <Row label="E-mail" value={c.email} />
              <Row label="Telefone" value={c.phone} />
              <Row label="WhatsApp" value={c.whatsapp} />
              <Row label="Origem" value={c.source} />
              <Row label="Empresa" value={c.company?.name} />
              <Row label="Owner" value={c.owner?.name} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
