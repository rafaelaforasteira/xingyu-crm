"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { contactsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { ContactFormDialog } from "@/components/crm/contact-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/form-controls";
import type { Contact } from "@/lib/types";

export function ContactsPage() {
  const searchParams = useSearchParams();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contact | null>(null);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setDialogOpen(true);
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.contacts.list({ page, search, status }),
    queryFn: () =>
      contactsApi.list({
        page,
        pageSize: 20,
        search: search || undefined,
        status: status || undefined,
      }),
    retry: false,
  });

  return (
    <div>
      <PageHeader
        title="Contatos"
        description="Base de leads e clientes."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo contato
          </Button>
        }
      />
      {error ? (
        <ErrorBanner message={(error as Error).message || "Falha ao carregar contatos"} />
      ) : null}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Buscar por nome, e-mail ou telefone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="sm:w-44"
        >
          <option value="">Todos os status</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Empresa</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Owner</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Última interação</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-4 py-3" colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!isLoading && (data?.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <EmptyState
                    icon={Users}
                    title="Nenhum contato"
                    description="Crie o primeiro contato ou aguarde a API."
                    actionLabel="Novo contato"
                    onAction={() => setDialogOpen(true)}
                  />
                </td>
              </tr>
            ) : null}
            {data?.data?.map((contact) => (
              <tr key={contact.id} className="border-b border-border/60 hover:bg-accent/40">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${contact.id}`} className="flex items-center gap-2.5">
                    <Avatar name={contact.name} size="sm" />
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.email || contact.phone || "—"}
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {contact.company?.name ?? "—"}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  {contact.owner?.name ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  <ClientRelativeTime value={contact.lastInteractionAt} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags?.slice(0, 2).map((t) => (
                      <Badge key={t.id} variant="outline">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(contact);
                      setDialogOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                </td>
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

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editing}
      />
    </div>
  );
}
