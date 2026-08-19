"use client";
import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, KeyRound, ShieldCheck, UserRound, Users, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { settingsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { can } from "@/lib/access-policy";
import { AUTH_ROLE_LABEL } from "@/lib/auth-types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { cn } from "@/lib/utils";

type Section = "profile"|"organization"|"users"|"teams"|"permissions";
const adminSections = [{id:"organization",label:"Organização",icon:Building2},{id:"users",label:"Usuários",icon:Users},{id:"teams",label:"Equipes",icon:UsersRound},{id:"permissions",label:"Permissões",icon:ShieldCheck}] as const;

export function SettingsCenter() {
  const { user, refreshCurrentUser } = useAuth(); const params = useSearchParams(); const router = useRouter(); const qc = useQueryClient();
  const requested = (params.get("section") || "profile") as Section; const section: Section = requested !== "profile" && !can(user, "organization.manage") ? "profile" : requested;
  const profile = useQuery({ queryKey:["settings","profile"], queryFn:settingsApi.profile });
  const overview = useQuery({ queryKey:["settings","overview"], queryFn:settingsApi.overview, enabled:can(user,"organization.manage") });
  const users = useQuery({ queryKey:["settings","managed-users"], queryFn:()=>usersApi.list({pageSize:100}), enabled:section==="users" && can(user,"users.manage") });
  const teams = useQuery({ queryKey:["settings","teams"], queryFn:settingsApi.teams, enabled:section==="teams" && can(user,"teams.manage") });
  const [form,setForm]=React.useState({name:"",phone:"",title:"",locale:"pt-BR",timezone:"America/Sao_Paulo"});
  React.useEffect(()=>{if(profile.data)setForm({name:profile.data.name,phone:profile.data.phone||"",title:profile.data.title||"",locale:profile.data.locale,timezone:profile.data.timezone});},[profile.data]);
  const saveProfile=useMutation({mutationFn:()=>settingsApi.updateProfile(form as any),onSuccess:async()=>{toast.success("Perfil atualizado");await Promise.all([qc.invalidateQueries({queryKey:["settings","profile"]}),refreshCurrentUser()]);},onError:(e:Error)=>toast.error(e.message)});
  const setSection=(id:Section)=>router.replace(`/settings?section=${id}`);
  return <div><PageHeader title="Configurações" description="Gerencie sua conta e as configurações do CRM" />
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="h-fit rounded-xl border bg-card p-2 shadow-soft"><NavButton active={section==="profile"} icon={UserRound} label="Meu perfil" onClick={()=>setSection("profile")} />{can(user,"organization.manage")&&<><p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Administração</p>{adminSections.map(item=><NavButton key={item.id} active={section===item.id} icon={item.icon} label={item.label} onClick={()=>setSection(item.id)} />)}</>}</aside>
      <main>{profile.error?<ErrorBanner message="Não foi possível carregar as configurações."/>:null}
        {section==="profile"&&<Card><CardHeader><div className="flex items-center gap-3"><Avatar name={profile.data?.name||user?.name||"Usuário"}/><div><CardTitle>Meu perfil</CardTitle><p className="text-sm text-muted-foreground">{user?AUTH_ROLE_LABEL[user.role]:"—"}{profile.data?.team?` · ${profile.data.team.name}`:""}</p></div></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="E-mail"><Input value={profile.data?.email||""} readOnly className="bg-muted"/></Field><Field label="Telefone"><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Cargo"><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field></div><div className="border-t pt-5"><h3 className="mb-3 font-semibold">Preferências</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Idioma"><Select value={form.locale} onChange={e=>setForm({...form,locale:e.target.value})}><option value="pt-BR">Português (Brasil)</option><option value="en">English</option><option value="zh-CN">简体中文</option><option value="zh-HK">繁體中文</option></Select></Field><Field label="Fuso horário"><Select value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})}><option>America/Sao_Paulo</option><option>America/Manaus</option><option>UTC</option><option>Asia/Shanghai</option><option>Asia/Hong_Kong</option></Select></Field></div></div><Button onClick={()=>saveProfile.mutate()} disabled={saveProfile.isPending}>Salvar alterações</Button></CardContent></Card>}
        {section==="organization"&&overview.data&&<Organization data={overview.data} />}
        {section==="users"&&<Card><CardHeader><CardTitle>Usuários</CardTitle></CardHeader><CardContent className="space-y-2">{users.data?.data.map(member=><div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong>{member.name}</strong><p className="text-xs text-muted-foreground">{member.email}</p></div><div className="flex items-center gap-2"><Badge variant={member.status==="ACTIVE"?"success":"secondary"}>{member.status}</Badge><span className="text-sm">{member.authRole==="MANAGER"?"Supervisor":member.authRole==="ADMIN"?"Administrador":"Consultora"}</span></div></div>)}</CardContent></Card>}
        {section==="teams"&&<Card><CardHeader><CardTitle>Equipes</CardTitle></CardHeader><CardContent className="space-y-2">{teams.data?.map(team=><div key={team.id} className="rounded-lg border p-3"><strong>{team.name}</strong><p className="text-xs text-muted-foreground">Equipe operacional</p></div>)}</CardContent></Card>}
        {section==="permissions"&&<PermissionsMatrix />}
      </main></div></div>;
}
function NavButton({active,icon:Icon,label,onClick}:{active:boolean;icon:React.ComponentType<{className?:string}>;label:string;onClick:()=>void}){return <button onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",active?"bg-primary/10 font-medium text-primary":"text-muted-foreground hover:bg-muted")}><Icon className="h-4 w-4"/>{label}</button>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>}
function Organization({data}:{data:any}){const qc=useQueryClient();const [name,setName]=React.useState(data.organization?.name||data.organizationName||"");const [timezone,setTimezone]=React.useState(data.organization?.timezone||data.timezone||"America/Sao_Paulo");const [currency,setCurrency]=React.useState(data.organization?.currency||data.currency||"BRL");const save=useMutation({mutationFn:()=>settingsApi.updateOrganization({name,timezone,currency}),onSuccess:()=>{toast.success("Organização atualizada");qc.invalidateQueries({queryKey:["settings","overview"]})}});return <Card><CardHeader><CardTitle>Organização</CardTitle></CardHeader><CardContent className="space-y-4"><Field label="Nome"><Input value={name} onChange={e=>setName(e.target.value)}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Timezone padrão"><Select value={timezone} onChange={e=>setTimezone(e.target.value)}><option>America/Sao_Paulo</option><option>America/Manaus</option><option>UTC</option><option>Asia/Shanghai</option><option>Asia/Hong_Kong</option></Select></Field><Field label="Moeda"><Select value={currency} onChange={e=>setCurrency(e.target.value)}><option>BRL</option><option>USD</option><option>CNY</option></Select></Field></div><Button onClick={()=>save.mutate()}>Salvar organização</Button></CardContent></Card>}
function PermissionsMatrix(){const rows=[["Dashboard","Total","—","—"],["Clientes","Total","—","—"],["Pipelines","Todos","Todos","Próprios"],["Pedidos","Todos","Todos","Próprios"],["Financeiro geral","Total","—","—"],["Meu perfil","Próprio","Próprio","Próprio"],["Administração","Total","—","—"]];return <Card><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/>Permissões</CardTitle><p className="text-sm text-muted-foreground">Matriz canônica inicial. TEAM está preparado para evolução futura.</p></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Área</th><th>Administrador</th><th>Supervisor</th><th>Consultora</th></tr></thead><tbody>{rows.map(row=><tr key={row[0]} className="border-b"><td className="p-3 font-medium">{row[0]}</td>{row.slice(1).map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div></CardContent></Card>}
