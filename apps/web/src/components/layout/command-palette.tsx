"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  Building2,
  CheckSquare,
  Kanban,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";
import { searchApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const router = useRouter();
  const [q, setQ] = React.useState("");

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => searchApi.search(q),
    enabled: open && q.trim().length >= 2,
    retry: false,
  });

  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/30 p-4 pt-[12vh] backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Fechar busca"
        onClick={() => setOpen(false)}
      />
      <Command
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-drawer"
        shouldFilter={false}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Command.Input
            value={q}
            onValueChange={setQ}
            placeholder="Buscar em todo o CRM…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            {q.length < 2
              ? "Digite ao menos 2 caracteres"
              : isFetching
                ? "Buscando…"
                : "Nenhum resultado"}
          </Command.Empty>

          {data?.contacts?.length ? (
            <Command.Group heading="Contatos" className="px-1 py-1 text-xs text-muted-foreground">
              {data.contacts.slice(0, 5).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/contacts/${c.id}`)} icon={Users}>
                  {c.name}
                </CommandItem>
              ))}
            </Command.Group>
          ) : null}

          {data?.companies?.length ? (
            <Command.Group heading="Empresas" className="px-1 py-1 text-xs text-muted-foreground">
              {data.companies.slice(0, 5).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/companies/${c.id}`)} icon={Building2}>
                  {c.name}
                </CommandItem>
              ))}
            </Command.Group>
          ) : null}

          {data?.deals?.length ? (
            <Command.Group heading="Negócios" className="px-1 py-1 text-xs text-muted-foreground">
              {data.deals.slice(0, 5).map((d) => (
                <CommandItem
                  key={d.id}
                  onSelect={() => go(`/pipelines/${d.pipelineId}/deals/${d.id}`)}
                  icon={Kanban}
                >
                  {d.name}
                </CommandItem>
              ))}
            </Command.Group>
          ) : null}

          {data?.orders?.length ? (
            <Command.Group heading="Pedidos" className="px-1 py-1 text-xs text-muted-foreground">
              {data.orders.slice(0, 5).map((o) => (
                <CommandItem key={o.id} onSelect={() => go(`/orders/${o.id}`)} icon={ShoppingCart}>
                  #{o.number}
                </CommandItem>
              ))}
            </Command.Group>
          ) : null}

          {data?.tasks?.length ? (
            <Command.Group heading="Tarefas" className="px-1 py-1 text-xs text-muted-foreground">
              {data.tasks.slice(0, 5).map((t) => (
                <CommandItem key={t.id} onSelect={() => go(`/tasks`)} icon={CheckSquare}>
                  {t.title}
                </CommandItem>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
      </Command>
    </div>
  );
}

function CommandItem({
  children,
  onSelect,
  icon: Icon,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground aria-selected:bg-accent",
      )}
    >
      <Icon className="h-4 w-4 text-primary" />
      {children}
    </Command.Item>
  );
}
