"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contactsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Contact } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";

const schema = z.object({
  firstName: z.string().min(1, "Informe o nome"),
  lastName: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  source: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function splitDisplayName(name?: string | null): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function contactFormDefaults(contact?: Contact | null): FormValues {
  const fromName = splitDisplayName(contact?.name);
  return {
    firstName: contact?.firstName ?? fromName.firstName,
    lastName: contact?.lastName ?? fromName.lastName,
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    whatsapp: contact?.whatsapp ?? "",
    source: contact?.source ?? "",
  };
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: contactFormDefaults(contact),
  });

  React.useEffect(() => {
    form.reset(contactFormDefaults(contact));
  }, [contact, form, open]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        whatsapp: values.whatsapp || undefined,
        source: values.source || undefined,
      };
      return contact
        ? contactsApi.update(contact.id, payload)
        : contactsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success(contact ? "Contato atualizado" : "Contato criado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={contact ? "Editar contato" : "Novo contato"}
      description="Dados principais do lead/cliente."
    >
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="firstName">Nome</Label>
            <Input id="firstName" {...form.register("firstName")} />
            {form.formState.errors.firstName ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input id="lastName" {...form.register("lastName")} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" {...form.register("whatsapp")} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="source">Origem</Label>
          <Input id="source" {...form.register("source")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
