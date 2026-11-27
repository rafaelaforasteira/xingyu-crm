"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CircleUserRound,
  CreditCard,
  Flag,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { ordersApi } from "@/lib/api";
import { formatPhoneForDisplay } from "@/lib/format-phone-display";
import {
  countryCodeToFlag,
  displayOrderNumber,
  getOperationalStageProgress,
  inferCountryCode,
  localizedCountryName,
  resolveCountryCode,
} from "@/lib/order-identification-utils";
import { orderText, stageLabel, type OrderLocale } from "@/lib/orders-i18n";
import type { Order, OrderStageDefinition, UpdateOrderInput } from "@/lib/types";

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
  countryCode: string;
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
    countryCode: resolveCountryCode(order.countrySnapshot, order.countryCodeSnapshot),
  };
}

const clean = (value: string) => value.trim();

type Props = {
  order: Order;
  locale: OrderLocale;
  stages: OrderStageDefinition[];
};

export function OrderIdentificationCard({ order, locale, stages }: Props) {
  const t = orderText(locale);
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [stageCompleted, setStageCompleted] = React.useState(false);
  const [entered, setEntered] = React.useState(false);
  const [form, setForm] = React.useState<IdentityForm>(() => initialForm(order));

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  React.useEffect(() => {
    if (!editing) setForm(initialForm(order));
  }, [editing, order]);

  const progress = React.useMemo(
    () => getOperationalStageProgress(stages, order.operationalStageId),
    [order.operationalStageId, stages],
  );
  const currentStage = progress.currentStage || order.operationalStage;
  const nextStage = progress.nextStage;
  const workflowComplete = progress.complete || Boolean(currentStage?.isFinal);

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

  const completeStage = useMutation({
    mutationFn: () => {
      if (!nextStage) throw new Error("No next operational stage");
      return ordersApi.update(order.id, { operationalStageId: nextStage.id });
    },
    onSuccess: (saved) => {
      const resolvedStage = nextStage;
      queryClient.setQueryData<Order>(["orders", order.id, "workspace"], (current) => ({
        ...(current || order),
        ...saved,
        operationalStageId: resolvedStage?.id || saved.operationalStageId,
        operationalStage: resolvedStage || saved.operationalStage,
      }));
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      setStageCompleted(true);
      window.setTimeout(() => setStageCompleted(false), 650);
    },
    onError: () => toast.error(t.stageUpdateError),
  });

  const name = order.customerNameSnapshot || contactName(order);
  const email = order.customerEmailSnapshot || order.contact?.email || order.company?.email;
  const phone =
    order.customerPhoneSnapshot ||
    order.contact?.phone ||
    order.contact?.whatsapp ||
    order.company?.phone;
  const document =
    order.contact?.cpf || order.contact?.cnpj || order.company?.cnpj || order.company?.document;
  const countryCode = resolveCountryCode(order.countrySnapshot, order.countryCodeSnapshot);
  const countryName = localizedCountryName(order.countrySnapshot, countryCode, locale);
  const flag = countryCodeToFlag(countryCode);

  const set = (field: keyof IdentityForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((current) => {
      if (field === "country") {
        return { ...current, country: value, countryCode: inferCountryCode(value) };
      }
      return { ...current, [field]: field === "countryCode" ? value.toUpperCase() : value };
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate({
      customerSnapshot: { name: clean(form.name), email: clean(form.email), phone: clean(form.phone) },
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
        countryCode: clean(form.countryCode).toUpperCase(),
      },
    });
  };

  return (
    <section
      data-testid="order-identification-card"
      className={`rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none ${entered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span data-testid="order-official-number">
            {displayOrderNumber(order.externalName, order.number)}
          </span>
        </div>
        {currentStage ? (
          <span
            data-testid="order-current-stage"
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
            style={{
              borderColor: `${currentStage.color}45`,
              backgroundColor: `${currentStage.color}14`,
              color: currentStage.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {stageLabel(currentStage, locale)}
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="complete-order-stage"
          disabled={workflowComplete || completeStage.isPending || stageCompleted}
          onClick={() => completeStage.mutate()}
          className={`ml-auto h-8 gap-1.5 text-xs transition-all motion-reduce:transform-none motion-reduce:transition-none ${
            workflowComplete || stageCompleted
              ? "border-success/30 bg-success/10 text-success disabled:opacity-100"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
          } ${stageCompleted ? "motion-safe:scale-[1.02]" : ""}`}
        >
          {completeStage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {workflowComplete || stageCompleted ? <Check className="h-3.5 w-3.5" /> : null}
          {completeStage.isPending
            ? t.completingStage
            : stageCompleted
              ? t.stageCompleted
              : workflowComplete
                ? t.completed
                : t.completeStage}
        </Button>
      </div>

      <div className="my-4 border-t border-border/60" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.customer}
        </p>
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
            <Pencil className="h-3.5 w-3.5" /> {t.edit}
          </Button>
        ) : null}
      </div>

      {!editing ? (
        <div className="mt-3">
          <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReadValue icon={CircleUserRound} label={t.name} value={name} missing={t.notInformed} />
            <ReadValue icon={Mail} label={t.email} value={email} href={email ? `mailto:${email}` : undefined} missing={t.notInformed} />
            <ReadValue icon={Phone} label={t.phone} value={phone ? formatPhoneForDisplay(phone) : undefined} href={phone ? `tel:${phone}` : undefined} missing={t.notInformed} />
            <ReadValue icon={CreditCard} label={t.document} value={document} missing={t.notInformed} />
          </dl>
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {t.shippingAddress}
            </p>
            <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReadValue icon={Flag} label={t.country} value={countryName ? `${flag ? `${flag} ` : ""}${countryName}` : undefined} missing={t.notInformed} />
              <ReadValue label={t.postalCode} value={order.postalCodeSnapshot} missing={t.notInformed} />
              <ReadValue label={t.state} value={order.provinceSnapshot} missing={t.notInformed} />
              <ReadValue label={t.city} value={order.citySnapshot} missing={t.notInformed} />
              <ReadValue label={t.neighborhood} value={order.neighborhoodSnapshot} missing={t.notInformed} />
              <ReadValue label={t.street} value={order.address1Snapshot} missing={t.notInformed} />
              <ReadValue label={t.number} value={order.addressNumberSnapshot} missing={t.notInformed} />
              <ReadValue label={t.complement} value={order.complementSnapshot || order.address2Snapshot} missing={t.notInformed} />
            </dl>
          </div>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={submit} data-testid="order-identification-form">
          <p className="text-xs text-muted-foreground">{t.orderScopedEdit}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <EditField label={t.name}><Input aria-label={t.name} required value={form.name} onChange={set("name")} /></EditField>
            <EditField label={t.email}><Input aria-label={t.email} type="email" value={form.email} onChange={set("email")} /></EditField>
            <EditField label={t.phone}><Input aria-label={t.phone} type="tel" value={form.phone} onChange={set("phone")} /></EditField>
            <div><Label>{t.document}</Label><p className={`flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm ${document ? "text-muted-foreground" : "text-destructive"}`}>{document || t.notInformed}</p></div>
          </div>
          <div className="border-t border-border/60 pt-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{t.shippingAddress}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <EditField label={t.recipient}><Input aria-label={t.recipient} value={form.recipientName} onChange={set("recipientName")} /></EditField>
              <EditField label={t.country}><Input aria-label={t.country} value={form.country} onChange={set("country")} /></EditField>
              <EditField label={t.countryCode}><Input aria-label={t.countryCode} maxLength={2} value={form.countryCode} onChange={set("countryCode")} /></EditField>
              <EditField label={t.postalCode}><Input aria-label={t.postalCode} value={form.postalCode} onChange={set("postalCode")} /></EditField>
              <EditField label={t.state}><Input aria-label={t.state} value={form.province} onChange={set("province")} /></EditField>
              <EditField label={t.city}><Input aria-label={t.city} value={form.city} onChange={set("city")} /></EditField>
              <EditField label={t.neighborhood}><Input aria-label={t.neighborhood} value={form.neighborhood} onChange={set("neighborhood")} /></EditField>
              <EditField label={t.street}><Input aria-label={t.street} value={form.address1} onChange={set("address1")} /></EditField>
              <EditField label={t.number}><Input aria-label={t.number} value={form.number} onChange={set("number")} /></EditField>
              <EditField label={t.complement} className="sm:col-span-2"><Input aria-label={t.complement} value={form.complement} onChange={set("complement")} /></EditField>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => { setForm(initialForm(order)); setEditing(false); }}>{t.cancel}</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t.saveChanges}</Button>
          </div>
        </form>
      )}
    </section>
  );
}

function ReadValue({ icon: Icon, label, value, href, missing }: { icon?: React.ComponentType<{ className?: string }>; label: string; value?: string | null; href?: string; missing: string }) {
  return <div className="min-w-0"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground">{Icon ? <Icon className="h-3.5 w-3.5" /> : null}{label}</dt><dd className={`mt-0.5 break-words text-sm ${value ? "text-foreground" : "text-destructive/80"}`}>{value ? (href ? <a href={href} className="hover:text-primary">{value}</a> : value) : missing}</dd></div>;
}

function EditField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label>{label}</Label>{children}</div>;
}
