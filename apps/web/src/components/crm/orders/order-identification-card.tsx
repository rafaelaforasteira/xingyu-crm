"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { ordersApi } from "@/lib/api";
import { orderText, type OrderLocale } from "@/lib/orders-i18n";
import type { Order, UpdateOrderInput } from "@/lib/types";

type IdentityForm = {
  name: string;
  email: string;
  phone: string;
  recipientName: string;
  address1: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

const contactName = (order: Order) =>
  order.contact?.name ||
  [order.contact?.firstName, order.contact?.lastName].filter(Boolean).join(" ") ||
  order.company?.tradeName ||
  order.company?.legalName ||
  "";

function initialForm(order: Order): IdentityForm {
  return {
    name: order.customerNameSnapshot || contactName(order),
    email: order.customerEmailSnapshot || order.contact?.email || order.company?.email || "",
    phone:
      order.customerPhoneSnapshot ||
      order.contact?.phone ||
      order.contact?.whatsapp ||
      order.company?.phone ||
      "",
    recipientName: order.recipientNameSnapshot || order.customerNameSnapshot || contactName(order),
    address1: order.address1Snapshot || "",
    number: order.addressNumberSnapshot || "",
    complement: order.complementSnapshot || order.address2Snapshot || "",
    neighborhood: order.neighborhoodSnapshot || "",
    city: order.citySnapshot || "",
    province: order.provinceSnapshot || "",
    postalCode: order.postalCodeSnapshot || "",
    country: order.countrySnapshot || "",
  };
}

const clean = (value: string) => value.trim();

export function OrderIdentificationCard({ order, locale }: { order: Order; locale: OrderLocale }) {
  const t = orderText(locale);
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<IdentityForm>(() => initialForm(order));
  React.useEffect(() => {
    if (!editing) setForm(initialForm(order));
  }, [editing, order]);

  const save = useMutation({
    mutationFn: (data: UpdateOrderInput) => ordersApi.update(order.id, data),
    onSuccess: (saved) => {
      queryClient.setQueryData<Order>(["orders", order.id, "workspace"], (current) =>
        current ? { ...current, ...saved } : saved,
      );
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t.saveSuccess);
      setEditing(false);
    },
    onError: () => toast.error(t.saveError),
  });

  const rawNumber = order.externalName || order.number;
  const displayNumber = rawNumber.startsWith("#") ? rawNumber : `#${rawNumber}`;
  const name = order.customerNameSnapshot || contactName(order) || t.customerUnidentified;
  const email = order.customerEmailSnapshot || order.contact?.email || order.company?.email;
  const phone =
    order.customerPhoneSnapshot ||
    order.contact?.phone ||
    order.contact?.whatsapp ||
    order.company?.phone;
  const document =
    order.contact?.cpf || order.contact?.cnpj || order.company?.cnpj || order.company?.document;
  const addressLines = [
    order.recipientNameSnapshot,
    [order.address1Snapshot, order.addressNumberSnapshot].filter(Boolean).join(", "),
    [order.complementSnapshot || order.address2Snapshot, order.neighborhoodSnapshot]
      .filter(Boolean)
      .join(", "),
    [order.citySnapshot, order.provinceSnapshot].filter(Boolean).join(" - "),
    [order.postalCodeSnapshot, order.countrySnapshot].filter(Boolean).join(" · "),
  ].filter(Boolean);

  const set = (field: keyof IdentityForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate({
      customerSnapshot: {
        name: clean(form.name),
        email: clean(form.email),
        phone: clean(form.phone),
      },
      addressSnapshot: {
        recipientName: clean(form.recipientName),
        address1: clean(form.address1),
        number: clean(form.number),
        complement: clean(form.complement),
        neighborhood: clean(form.neighborhood),
        city: clean(form.city),
        province: clean(form.province),
        postalCode: clean(form.postalCode),
        country: clean(form.country),
      },
    });
  };

  return (
    <section
      data-testid="order-identification-card"
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t.orderIdentification}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{displayNumber}</h3>
        </div>
        {!editing ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={() => {
              setForm(initialForm(order));
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t.edit}
          </Button>
        ) : null}
      </div>

      {!editing ? (
        <div className="mt-3">
          <p className="text-base font-semibold text-foreground">{name}</p>
          {email || phone || document ? (
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {email ? <ReadValue label={t.email} value={email} href={`mailto:${email}`} /> : null}
              {phone ? <ReadValue label={t.phone} value={phone} href={`tel:${phone}`} /> : null}
              {document ? <ReadValue label={t.document} value={document} /> : null}
            </dl>
          ) : null}
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="text-xs font-medium text-muted-foreground">{t.shippingAddress}</p>
            {addressLines.length ? (
              <address className="mt-2 space-y-0.5 text-sm not-italic text-foreground">
                {addressLines.map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </address>
            ) : order.formattedAddressSnapshot ? (
              <p className="mt-2 whitespace-pre-line text-sm text-foreground">
                {order.formattedAddressSnapshot}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{t.notInformed}</p>
            )}
          </div>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={submit} data-testid="order-identification-form">
          <p className="text-xs text-muted-foreground">{t.orderScopedEdit}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <EditField label={t.name}>
              <Input aria-label={t.name} required value={form.name} onChange={set("name")} />
            </EditField>
            <EditField label={t.email}>
              <Input aria-label={t.email} type="email" value={form.email} onChange={set("email")} />
            </EditField>
            <EditField label={t.phone}>
              <Input aria-label={t.phone} type="tel" value={form.phone} onChange={set("phone")} />
            </EditField>
            {document ? (
              <div>
                <Label>{t.document}</Label>
                <p className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                  {document}
                </p>
              </div>
            ) : null}
          </div>
          <div className="border-t border-border/60 pt-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{t.shippingAddress}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <EditField label={t.recipient} className="sm:col-span-2">
                <Input
                  aria-label={t.recipient}
                  value={form.recipientName}
                  onChange={set("recipientName")}
                />
              </EditField>
              <EditField label={t.street} className="sm:col-span-2 lg:col-span-3">
                <Input aria-label={t.street} value={form.address1} onChange={set("address1")} />
              </EditField>
              <EditField label={t.number}>
                <Input aria-label={t.number} value={form.number} onChange={set("number")} />
              </EditField>
              <EditField label={t.complement} className="sm:col-span-2">
                <Input
                  aria-label={t.complement}
                  value={form.complement}
                  onChange={set("complement")}
                />
              </EditField>
              <EditField label={t.neighborhood} className="sm:col-span-2">
                <Input
                  aria-label={t.neighborhood}
                  value={form.neighborhood}
                  onChange={set("neighborhood")}
                />
              </EditField>
              <EditField label={t.city} className="sm:col-span-2">
                <Input aria-label={t.city} value={form.city} onChange={set("city")} />
              </EditField>
              <EditField label={t.state}>
                <Input aria-label={t.state} value={form.province} onChange={set("province")} />
              </EditField>
              <EditField label={t.postalCode}>
                <Input
                  aria-label={t.postalCode}
                  value={form.postalCode}
                  onChange={set("postalCode")}
                />
              </EditField>
              <EditField label={t.country} className="sm:col-span-2">
                <Input aria-label={t.country} value={form.country} onChange={set("country")} />
              </EditField>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => {
                setForm(initialForm(order));
                setEditing(false);
              }}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.saveChanges}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function ReadValue({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">
        {href ? (
          <a href={href} className="hover:text-primary">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function EditField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
