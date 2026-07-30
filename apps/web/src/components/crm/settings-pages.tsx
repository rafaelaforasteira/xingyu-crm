"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pipelinesApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { SettingsOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label, Select } from "@/components/ui/form-controls";
import { Avatar } from "@/components/ui/avatar";
import { Settings, Tags, Users, Plug, Kanban, FormInput } from "lucide-react";

export const SETTINGS_LINKS = [
  { href: "/settings/general", label: "Geral", icon: Settings },
  { href: "/settings/pipelines", label: "Pipelines", icon: Kanban },
  { href: "/settings/custom-fields", label: "Campos customizados", icon: FormInput },
  { href: "/settings/tags", label: "Tags", icon: Tags },
  { href: "/settings/users", label: "Usuários", icon: Users },
  { href: "/settings/integrations", label: "Integrações", icon: Plug },
];

function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 sm:flex-col sm:gap-0.5">
      {SETTINGS_LINKS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-2 shadow-soft">
          <SettingsNav />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function SettingsIndexPage() {
  return <SettingsGeneralPage />;
}

export function SettingsGeneralPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    retry: false,
  });

  const [orgName, setOrgName] = React.useState("");
  const [timezone, setTimezone] = React.useState("");
  const [currency, setCurrency] = React.useState("BRL");

  React.useEffect(() => {
    if (data) {
      setOrgName(data.organizationName);
      setTimezone(data.timezone);
      setCurrency(data.currency);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      settingsApi.update({
        organizationName: orgName,
        timezone,
        currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success("Configurações salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SettingsShell
      title="Configurações"
      description="Preferências da organização e da operação."
    >
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome da organização</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Fuso horário</Label>
                <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                  <option value="America/Manaus">America/Manaus</option>
                  <option value="UTC">UTC</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Moeda</Label>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                </Select>
              </div>
            </div>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Salvar
            </Button>
          </CardContent>
        </Card>
      )}
    </SettingsShell>
  );
}

export function SettingsPipelinesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: () => pipelinesApi.list(),
    retry: false,
  });

  return (
    <SettingsShell title="Pipelines" description="Funis disponíveis na operação.">
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Kanban} title="Nenhum pipeline configurado" />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.stages?.length ?? 0} estágios · {p.dealsCount ?? 0} negócios
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.isDefault ? <Badge>Padrão</Badge> : null}
                  <Link href={`/pipelines/${p.id}`}>
                    <Button size="sm" variant="outline">
                      Abrir quadro
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsShell>
  );
}

export function SettingsCustomFieldsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.settings, "custom-fields"],
    queryFn: () =>
      settingsApi.overview().then((overview) => ({
        overview,
        fields:
          (
            overview as SettingsOverview & {
              customFields?: { id: string; entity: string; name: string; type: string }[];
            }
          ).customFields ?? [],
      })),
    retry: false,
  });

  return (
    <SettingsShell
      title="Campos customizados"
      description="Campos extras por entidade."
    >
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {!isLoading && (data?.fields.length ?? 0) === 0 ? (
        <EmptyState
          icon={FormInput}
          title="Nenhum campo customizado"
          description="A API de settings ainda não retornou campos."
        />
      ) : null}
      {!isLoading && (data?.fields.length ?? 0) > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Entidade</th>
                <th className="px-4 py-3 text-left font-medium">Campo</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {data?.fields.map((f) => (
                <tr key={f.id} className="border-b border-border/60">
                  <td className="px-4 py-3">{f.entity}</td>
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{f.type}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SettingsShell>
  );
}

export function SettingsTagsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.settings, "tags"],
    queryFn: async () => {
      const overview = await settingsApi.overview();
      const contacts = await import("@/lib/api").then((m) =>
        m.contactsApi.list({ page: 1, pageSize: 50 }),
      );
      const tags = new Map<string, { id: string; name: string; color?: string; count: number }>();
      for (const c of contacts.data) {
        for (const t of c.tags ?? []) {
          const prev = tags.get(t.id);
          tags.set(t.id, {
            id: t.id,
            name: t.name,
            color: t.color,
            count: (prev?.count ?? 0) + 1,
          });
        }
      }
      return { overview, tags: Array.from(tags.values()) };
    },
    retry: false,
  });

  return (
    <SettingsShell title="Tags" description="Etiquetas usadas em contatos e negócios.">
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data?.tags.length ?? 0) === 0 ? (
        <EmptyState icon={Tags} title="Nenhuma tag em uso" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {data?.tags.map((t) => (
            <Badge key={t.id} variant="outline" className="gap-2 px-3 py-1.5 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: t.color || "var(--primary)" }}
              />
              {t.name}
              <span className="text-muted-foreground">({t.count})</span>
            </Badge>
          ))}
        </div>
      )}
    </SettingsShell>
  );
}

export function SettingsUsersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    retry: false,
  });

  const users = data?.users ?? [];
  const teams = data?.teams ?? [];

  return (
    <SettingsShell title="Usuários" description="Equipe com acesso ao CRM.">
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário" />
      ) : (
        <div className="space-y-4">
          {teams.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <Badge key={t.id} variant="secondary">
                  {t.name}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Usuário</th>
                  <th className="px-4 py-3 text-left font-medium">Papel</th>
                  <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
                    Equipe
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={u.name} size="sm" />
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{u.role || "—"}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">{u.team || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SettingsShell>
  );
}

export function SettingsIntegrationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    retry: false,
  });

  const integrations = data?.integrations ?? [];
  const channels = data?.channels ?? [];

  return (
    <SettingsShell
      title="Integrações"
      description="Canais e conexões externas."
    >
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Integrações</h2>
            {integrations.length === 0 ? (
              <EmptyState icon={Plug} title="Nenhuma integração" />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {integrations.map((i) => (
                  <Card key={i.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <span className="font-medium">{i.name}</span>
                      <Badge variant={i.connected ? "success" : "secondary"}>
                        {i.connected ? "Conectada" : "Desconectada"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Canais</h2>
            {channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum canal configurado.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {channels.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="outline">{c.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </SettingsShell>
  );
}
