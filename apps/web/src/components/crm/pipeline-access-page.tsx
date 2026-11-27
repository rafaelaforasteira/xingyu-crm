"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader, ErrorBanner } from "./page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PipelineAccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const tab = params.get("tab") === "people" ? "people" : "teams";
  const [search, setSearch] = React.useState("");
  const query = useQuery({ queryKey: queryKeys.pipelines.access, queryFn: pipelinesApi.accessOverview });
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { accessMode: "ORGANIZATION" | "RESTRICTED"; teamIds: string[]; userIds: string[] } }) => pipelinesApi.updateAccess(id, data),
    onSuccess: (data) => { queryClient.setQueryData(queryKeys.pipelines.access, data); queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }); toast.success("Acessos atualizados"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const normalizedSearch = search.toLocaleLowerCase("pt-BR");
  const toggle = (pipeline: NonNullable<typeof query.data>["pipelines"][number], field: "teamIds" | "userIds", id: string) => {
    const values = new Set(pipeline[field]);
    if (values.has(id)) values.delete(id);
    else values.add(id);
    mutation.mutate({ id: pipeline.id, data: { accessMode: pipeline.accessMode, teamIds: field === "teamIds" ? [...values] : pipeline.teamIds, userIds: field === "userIds" ? [...values] : pipeline.userIds } });
  };

  return <div>
    <PageHeader title="Equipes e acessos" description="Controle quem pode visualizar e trabalhar em cada pipeline." actions={<Link className={buttonVariants({ variant: "outline" })} href="/pipelines"><ArrowLeft className="h-4 w-4" />Voltar para Pipelines</Link>} />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Tabs value={tab} onValueChange={(value) => router.replace(`/pipelines/access?tab=${value}`)}><TabsList><TabsTrigger value="teams">Equipes</TabsTrigger><TabsTrigger value="people">Pessoas</TabsTrigger></TabsList></Tabs>
      <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder={tab === "teams" ? "Buscar equipe..." : "Buscar pessoa..."} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    </div>
    {query.error ? <ErrorBanner message={(query.error as Error).message} /> : null}
    <div className="space-y-3">
      {tab === "teams" ? query.data?.teams.filter((team) => team.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch)).map((team) => <Card key={team.id}><CardContent className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">{team.name}</h2><p className="text-sm text-muted-foreground">{team.members?.length ?? 0} pessoas</p></div><UsersRound className="h-5 w-5 text-primary" /></div><div className="flex flex-wrap gap-2">{query.data.pipelines.map((pipeline) => <button key={pipeline.id} onClick={() => toggle(pipeline, "teamIds", team.id)} aria-pressed={pipeline.teamIds.includes(team.id)}><Badge variant={pipeline.teamIds.includes(team.id) ? "default" : "outline"}>{pipeline.name}</Badge></button>)}</div></CardContent></Card>) : query.data?.users.filter((user) => user.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch)).map((user) => <Card key={user.id}><CardContent className="p-5"><h2 className="font-semibold">{user.name}</h2><p className="mb-4 text-sm text-muted-foreground">{user.team?.name ?? "Sem equipe"}</p><div className="flex flex-wrap gap-2">{query.data.pipelines.map((pipeline) => { const inherited = pipeline.teamIds.includes(user.team?.id ?? ""); const direct = pipeline.userIds.includes(user.id); return <button key={pipeline.id} disabled={inherited} onClick={() => toggle(pipeline, "userIds", user.id)}><Badge variant={direct ? "default" : inherited ? "secondary" : "outline"}>{pipeline.name}{inherited ? " · via equipe" : direct ? " · direto" : ""}</Badge></button>; })}</div></CardContent></Card>)}
    </div>
    <div className="mt-6 space-y-2">{query.data?.pipelines.map((pipeline) => <label key={pipeline.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{pipeline.name}</span><select className="rounded-md border bg-background px-2 py-1" value={pipeline.accessMode} onChange={(event) => mutation.mutate({ id: pipeline.id, data: { accessMode: event.target.value as "ORGANIZATION" | "RESTRICTED", teamIds: pipeline.teamIds, userIds: pipeline.userIds } })}><option value="ORGANIZATION">Todos da organização</option><option value="RESTRICTED">Somente selecionados</option></select></label>)}</div>
  </div>;
}
