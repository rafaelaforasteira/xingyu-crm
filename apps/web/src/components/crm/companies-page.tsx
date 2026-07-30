"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { companiesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/form-controls";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const schema = z.object({
  name: z.string().min(2),
  document: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  industry: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CompaniesPage() {
  const searchParams = useSearchParams();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.companies.list({ page, search }),
    queryFn: () => companiesApi.list({ page, pageSize: 20, search: search || undefined }),
    retry: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", document: "", email: "", phone: "", industry: "" },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) => companiesApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      toast.success("Empresa criada");
      setOpen(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Empresas"
        description="Contas B2B e CNPJs."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova empresa
          </Button>
        }
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      <Input
        className="mb-4 max-w-sm"
        placeholder="Buscar empresas…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Empresa</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Documento</th>
              <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Setor</th>
              <th className="px-4 py-3 text-left font-medium">Contatos</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={4}>
                      <Skeleton className="h-7 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!isLoading && (data?.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={4} className="p-4">
                  <EmptyState icon={Building2} title="Nenhuma empresa" />
                </td>
              </tr>
            ) : null}
            {data?.data?.map((c) => (
              <tr key={c.id} className="border-b border-border/60 hover:bg-accent/40">
                <td className="px-4 py-3">
                  <Link href={`/companies/${c.id}`} className="font-medium hover:text-primary">
                    {c.name}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">{c.document || "—"}</td>
                <td className="hidden px-4 py-3 lg:table-cell">{c.industry || "—"}</td>
                <td className="px-4 py-3">{c.contactsCount ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data?.meta ? (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}

      <Dialog open={open} onOpenChange={setOpen} title="Nova empresa">
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
        >
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-1">
            <Label>CNPJ / Documento</Label>
            <Input {...form.register("document")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input {...form.register("email")} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input {...form.register("phone")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Setor</Label>
            <Input {...form.register("industry")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const company = useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: () => companiesApi.get(companyId),
    retry: false,
  });
  const contacts = useQuery({
    queryKey: ["companies", companyId, "contacts"],
    queryFn: () => companiesApi.contacts(companyId),
    retry: false,
  });

  if (company.isLoading) return <Skeleton className="h-40 w-full" />;
  if (company.isError || !company.data) {
    return <ErrorBanner message={(company.error as Error)?.message ?? "Empresa não encontrada"} />;
  }

  const c = company.data;

  return (
    <div>
      <PageHeader title={c.name} description={c.industry || c.document || undefined} />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <Row label="Documento" value={c.document} />
              <Row label="E-mail" value={c.email} />
              <Row label="Telefone" value={c.phone} />
              <Row label="Website" value={c.website} />
              <Row label="Owner" value={c.owner?.name} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contacts" className="space-y-2">
          {(contacts.data ?? []).map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="block rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent"
            >
              {contact.name}
            </Link>
          ))}
          {(contacts.data ?? []).length === 0 ? (
            <EmptyState title="Sem contatos" />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
