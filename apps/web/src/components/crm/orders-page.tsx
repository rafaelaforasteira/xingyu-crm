"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  GripVertical,
  Kanban,
  List,
  Package,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { contactsApi, ordersApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CreateOrderInput, Order, OrderStageDefinition } from "@/lib/types";
import {
  formatOrderCurrency,
  formatOrderDate,
  orderEnumLabel,
  orderText,
  stageLabel,
  type OrderLocale,
} from "@/lib/orders-i18n";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label, Select } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Popover } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/auth-provider";
import { OrderKanbanCard } from "@/components/crm/orders/order-kanban-card";
import { OrderWorkspaceContent } from "@/components/crm/orders/order-workspace-content";
const customer = (o: Order) => o.customerNameSnapshot || o.contact?.name || o.company?.name || "—";
const total = (o: Order) => Number(o.finalValue ?? o.total ?? 0);
function Column({
  stage,
  orders,
  locale,
  onOpen,
  onFinancialStatusChange,
  updatingOrderId,
}: {
  stage: OrderStageDefinition;
  orders: Order[];
  locale: OrderLocale;
  onOpen: (o: Order) => void;
  onFinancialStatusChange: (order: Order, status: string) => void;
  updatingOrderId?: string;
}) {
  const d = useDroppable({ id: stage.id });
  const t = orderText(locale);
  return (
    <section
      data-testid="orders-column"
      data-stage-id={stage.id}
      ref={d.setNodeRef}
      className="w-[290px] shrink-0 rounded-2xl bg-muted/35 p-2 ring-1 ring-border"
    >
      <header className="mb-2 flex items-center gap-2 px-1 py-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
        <h2 className="min-w-0 flex-1 truncate text-xs font-bold uppercase">
          {stageLabel(stage, locale)}
        </h2>
        <Badge variant="outline">{stage._count?.orders ?? orders.length}</Badge>
      </header>
      <div className="space-y-2">
        {orders.map((o) => (
          <OrderKanbanCard
            key={o.id}
            order={o}
            locale={locale}
            onOpen={() => onOpen(o)}
            onFinancialStatusChange={(status) => onFinancialStatusChange(o, status)}
            updating={updatingOrderId === o.id}
          />
        ))}
        {!orders.length ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            {t.stageEmpty}
          </p>
        ) : null}
      </div>
    </section>
  );
}
const languageOptions: Array<{ locale: OrderLocale; short: string; label: string }> = [
  { locale: "pt-BR", short: "🇧🇷 PT", label: "Português" },
  { locale: "en", short: "🇺🇸 EN", label: "English" },
  { locale: "zh-CN", short: "🇨🇳 简中", label: "简体中文" },
  { locale: "zh-HK", short: "🇭🇰 繁中", label: "繁體中文" },
];
function LanguageMenu({
  locale,
  open,
  onOpenChange,
  onChange,
  label,
}: {
  locale: OrderLocale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (locale: OrderLocale) => void;
  label: string;
}) {
  const current = languageOptions.find((option) => option.locale === locale)!;
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      contentWidth={210}
      aria-label={label}
      trigger={
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5 rounded-lg px-3"
          aria-label={label}
          onClick={() => onOpenChange(!open)}
        >
          {current.short}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="p-1.5">
        {languageOptions.map((option) => (
          <button
            type="button"
            key={option.locale}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              onChange(option.locale);
              onOpenChange(false);
            }}
          >
            <span className="flex-1">
              {option.short.split(" ")[0]} {option.label}
            </span>
            {option.locale === locale ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>
        ))}
      </div>
    </Popover>
  );
}
export function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter(),
    params = useSearchParams(),
    qc = useQueryClient();
  const view = params.get("view") === "list" ? "list" : "kanban";
  const [locale, setLocale] = React.useState<OrderLocale>("pt-BR"),
    [search, setSearch] = React.useState(params.get("q") || ""),
    [debounced, setDebounced] = React.useState(search),
    [selected, setSelected] = React.useState<Order | null>(null),
    [configure, setConfigure] = React.useState(false),
    [creating, setCreating] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const t = orderText(locale),
    page = Number(params.get("page") || 1);
  const replace = React.useCallback(
    (c: Record<string, string | null>) => {
      const n = new URLSearchParams(params.toString());
      Object.entries(c).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
      router.replace(`/orders?${n}`);
    },
    [params, router],
  );
  React.useEffect(() => {
    const x = setTimeout(() => {
      setDebounced(search);
      replace({ q: search || null, page: null });
    }, 250);
    return () => clearTimeout(x);
  }, [replace, search]);
  const stages = useQuery({ queryKey: ["orders", "stages"], queryFn: () => ordersApi.stages() });
  const orders = useQuery({
    queryKey: queryKeys.orders.list({ page, search: debounced }),
    queryFn: () =>
      ordersApi.list({
        page,
        pageSize: view === "kanban" ? 100 : 30,
        search: debounced || undefined,
      }),
  });
  const users = useQuery({
    queryKey: ["settings", "users", "orders"],
    queryFn: () => settingsApi.users(),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["orders"] });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) => ordersApi.update(id, data),
    onSuccess: (saved) => {
      setSelected((s) => (s?.id === saved.id ? { ...s, ...saved } : s));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const list = React.useMemo(() => orders.data?.data ?? [], [orders.data?.data]);
  const openOrder = (order: Order) => {
    setSelected(order);
    replace({ order: order.id });
  };
  React.useEffect(() => {
    const orderId = params.get("order");
    if (!orderId || selected?.id === orderId) return;
    const match = list.find((item) => item.id === orderId);
    if (match) setSelected(match);
    else
      void ordersApi
        .get(orderId)
        .then(setSelected)
        .catch((error: Error) => toast.error(error.message));
  }, [list, params, selected?.id]);
  const drag = (e: DragEndEvent) => {
    const o = list.find((x) => x.id === String(e.active.id)),
      stageId = e.over?.id && String(e.over.id);
    if (o && stageId && o.operationalStageId !== stageId)
      update.mutate({ id: o.id, data: { operationalStageId: stageId } });
  };
  return (
    <div>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t.newOrder}
            </Button>
            {user?.role === "ADMIN" ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="order-3 h-9 w-9 shrink-0 rounded-lg"
                aria-label={t.configure}
                title={t.configure}
                onClick={() => setConfigure(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            ) : null}
            <LanguageMenu
              locale={locale}
              open={languageOpen}
              onOpenChange={setLanguageOpen}
              onChange={setLocale}
              label={
                {
                  "pt-BR": "Alterar idioma",
                  en: "Change language",
                  "zh-CN": "切换语言",
                  "zh-HK": "更改語言",
                }[locale]
              }
            />
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Tabs value={view} onValueChange={(v) => replace({ view: v === "kanban" ? null : v })}>
          <TabsList>
            <TabsTrigger value="kanban">
              <Kanban className="mr-1 h-4 w-4" />
              {t.kanban}
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-1 h-4 w-4" />
              {t.list}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-[360px] lg:w-[420px] xl:w-[480px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
          />
        </div>
      </div>
      {orders.error || stages.error ? (
        <ErrorBanner message={String(orders.error || stages.error)} />
      ) : null}
      {orders.isLoading ? <Skeleton className="h-80 w-full" /> : null}
      {!orders.isLoading && !list.length ? <EmptyState icon={Package} title={t.empty} /> : null}
      {view === "kanban" && list.length ? (
        <DndContext sensors={sensors} onDragEnd={drag}>
          <div data-testid="orders-board-scroll" className="overflow-x-auto pt-1 pb-4">
            <div className="flex min-w-max gap-3">
              {(stages.data ?? []).map((s) => (
                <Column
                  key={s.id}
                  stage={s}
                  locale={locale}
                  orders={list.filter(
                    (o) => o.operationalStageId === s.id || (!o.operationalStageId && s.isInitial),
                  )}
                  onOpen={openOrder}
                  onFinancialStatusChange={(order, financialStatus) =>
                    update.mutate({ id: order.id, data: { financialStatus } })
                  }
                  updatingOrderId={update.isPending ? update.variables?.id : undefined}
                />
              ))}
            </div>
          </div>
        </DndContext>
      ) : null}
      {view === "list" && list.length ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                {[t.order, t.customer, t.stage, t.payment, t.owner, t.due, t.tracking, t.total].map(
                  (x) => (
                    <th key={x} className="p-3 text-left">
                      {x}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-t hover:bg-muted/30"
                  onClick={() => openOrder(o)}
                >
                  <td className="p-3 font-medium">#{o.externalName || o.number}</td>
                  <td className="p-3">{customer(o)}</td>
                  <td className="p-3">
                    {o.operationalStage ? stageLabel(o.operationalStage, locale) : "—"}
                  </td>
                  <td className="p-3">{orderEnumLabel(o.financialStatus || o.status, locale)}</td>
                  <td className="p-3">{o.operationalAssignee?.name || t.noOwner}</td>
                  <td className="p-3">
                    {o.operationalDueAt ? formatOrderDate(o.operationalDueAt, locale) : "—"}
                  </td>
                  <td className="p-3">{o.shipments?.[0]?.trackingCode || "—"}</td>
                  <td className="p-3 text-right">
                    {formatOrderCurrency(total(o), o.currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {view === "list" && orders.data?.meta ? (
        <PaginationBar
          page={orders.data.meta.page}
          totalPages={orders.data.meta.totalPages}
          onPageChange={(v) => replace({ page: String(v) })}
        />
      ) : null}
      <Workspace
        order={selected}
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) {
            setSelected(null);
            replace({ order: null });
          }
        }}
        stages={stages.data ?? []}
        users={users.data ?? []}
        locale={locale}
        onUpdate={(data) => selected && update.mutate({ id: selected.id, data })}
      />
      <CreateDialog
        open={creating}
        onOpenChange={setCreating}
        locale={locale}
        users={users.data ?? []}
        onCreated={() => {
          setCreating(false);
          refresh();
        }}
      />
      <StagesDialog open={configure} onOpenChange={setConfigure} locale={locale} />
    </div>
  );
}
function Workspace({
  order,
  open,
  onOpenChange,
  stages,
  users,
  locale,
  onUpdate,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stages: OrderStageDefinition[];
  users: Array<{ id: string; name: string }>;
  locale: OrderLocale;
  onUpdate: (d: Partial<Order>) => void;
}) {
  const q = useQuery({
    queryKey: ["orders", order?.id, "workspace"],
    queryFn: () => ordersApi.get(order!.id),
    enabled: open && !!order,
  });
  const v = q.data ?? order,
    t = orderText(locale);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.order}
      wide
      className="max-h-[calc(100vh-2rem)] max-w-[min(1280px,calc(100vw-2rem))] overflow-y-auto"
    >
      {q.isLoading ? <Skeleton className="h-[560px] w-full" /> : null}
      {!q.isLoading && v ? (
        <OrderWorkspaceContent
          order={v}
          locale={locale}
          stages={stages}
          users={users}
          onUpdate={onUpdate}
        />
      ) : null}
    </Dialog>
  );
}
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);
function CreateDialog({
  open,
  onOpenChange,
  locale,
  users,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: OrderLocale;
  users: Array<{ id: string; name: string }>;
  onCreated: () => void;
}) {
  const t = orderText(locale);
  const contacts = useQuery({
    queryKey: ["contacts", "order-create"],
    queryFn: () => contactsApi.list({ pageSize: 100 }),
    enabled: open,
  });
  const [form, setForm] = React.useState<CreateOrderInput>({
    currency: "BRL",
    source: "MANUAL",
    operationalPriority: "MEDIUM",
    items: [{ productName: "", sku: "", quantity: 1, unitPrice: 0 }],
  });
  const save = useMutation({
    mutationFn: () =>
      ordersApi.create({
        ...form,
        grossValue: (form.items ?? []).reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0),
        total:
          (form.items ?? []).reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0) -
          (form.discount ?? 0),
      }),
    onSuccess: () => {
      toast.success(t.create);
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const items = form.items ?? [];
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.createTitle}
      description={t.createDescription}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label={t.customer}>
          <Select
            required
            value={form.contactId || ""}
            onChange={(e) => {
              const c = contacts.data?.data.find((x) => x.id === e.target.value);
              setForm({
                ...form,
                contactId: e.target.value,
                customerSnapshot: {
                  name: c?.name,
                  email: c?.email ?? undefined,
                  phone: c?.phone ?? undefined,
                },
              });
            }}
          >
            <option value="">{t.selectCustomer}</option>
            {contacts.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.date}>
            <Input
              type="datetime-local"
              onChange={(e) =>
                setForm({
                  ...form,
                  orderedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
            />
          </Field>
          <Field label={t.currency}>
            <Select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {["BRL", "USD", "CNY", "HKD"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="rounded-xl border p-3">
          <h3 className="mb-3 font-semibold">{t.items}</h3>
          <div className="space-y-2">
            {items.map((item, index) => {
              const change = (next: typeof item) =>
                setForm({
                  ...form,
                  items: items.map((current, position) => (position === index ? next : current)),
                });
              return (
                <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1fr_90px_130px_36px]">
                  <Input
                    required
                    placeholder={t.product}
                    value={item.productName}
                    onChange={(e) => change({ ...item, productName: e.target.value })}
                  />
                  <Input
                    placeholder={t.sku}
                    value={item.sku}
                    onChange={(e) => change({ ...item, sku: e.target.value })}
                  />
                  <Input
                    aria-label={t.quantity}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => change({ ...item, quantity: Number(e.target.value) })}
                  />
                  <Input
                    aria-label={t.unitPrice}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => change({ ...item, unitPrice: Number(e.target.value) })}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    aria-label={t.cancel}
                    onClick={() =>
                      setForm({ ...form, items: items.filter((_, position) => position !== index) })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() =>
              setForm({
                ...form,
                items: [...items, { productName: "", sku: "", quantity: 1, unitPrice: 0 }],
              })
            }
          >
            <Plus className="h-4 w-4" />
            {t.addItem}
          </Button>
          <div className="mt-3 flex justify-between border-t pt-3 text-sm">
            <span>{t.total}</span>
            <strong>
              {formatOrderCurrency(
                items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0),
                form.currency,
                locale,
              )}
            </strong>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.owner}>
            <Select
              value={form.operationalAssigneeId || ""}
              onChange={(e) =>
                setForm({ ...form, operationalAssigneeId: e.target.value || undefined })
              }
            >
              <option value="">{t.optional}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.priority}>
            <Select
              value={form.operationalPriority}
              onChange={(e) => setForm({ ...form, operationalPriority: e.target.value })}
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((x) => (
                <option key={x} value={x}>
                  {orderEnumLabel(x, locale)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t.saving : t.create}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
function StageRow({
  stage,
  locale,
  onEdit,
}: {
  stage: OrderStageDefinition;
  locale: OrderLocale;
  onEdit: (s: OrderStageDefinition) => void;
}) {
  const s = useSortable({ id: stage.id }),
    t = orderText(locale);
  return (
    <div
      ref={s.setNodeRef}
      style={{ transform: CSS.Transform.toString(s.transform), transition: s.transition }}
      className="flex items-center gap-2 rounded-lg border p-2"
    >
      <button {...s.attributes} {...s.listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="h-3 w-3 rounded-full" style={{ background: stage.color }} />
      <span className="flex-1 text-sm">{stageLabel(stage, locale)}</span>
      {stage.isInitial ? <Badge>{t.initial}</Badge> : null}
      {stage.isFinal ? <Badge variant="secondary">{t.final}</Badge> : null}
      <small>
        {stage._count?.orders ?? 0} {t.stageInUse}
      </small>
      <Button size="sm" variant="ghost" onClick={() => onEdit(stage)}>
        {t.edit}
      </Button>
    </div>
  );
}
function StagesDialog({
  open,
  onOpenChange,
  locale,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: OrderLocale;
}) {
  const qc = useQueryClient(),
    t = orderText(locale),
    q = useQuery({
      queryKey: ["orders", "stages", "all"],
      queryFn: () => ordersApi.stages(true),
      enabled: open,
    });
  const [edit, setEdit] = React.useState<OrderStageDefinition | null>(null),
    [name, setName] = React.useState(""),
    [translations, setTranslations] = React.useState<Record<string, string>>({}),
    [color, setColor] = React.useState("#64748b"),
    [category, setCategory] = React.useState<OrderStageDefinition["category"]>("IN_PROGRESS"),
    [isInitial, setIsInitial] = React.useState(false),
    [isFinal, setIsFinal] = React.useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["orders", "stages"] });
  };
  const mutate = useMutation({
    mutationFn: async () =>
      edit
        ? ordersApi.updateStage(edit.id, {
            name,
            translations: { ...translations, "pt-BR": name },
            color,
            category,
            isInitial,
            isFinal,
          })
        : ordersApi.createStage({
            name,
            category,
            color,
            isInitial,
            isFinal,
            translations: { ...translations, "pt-BR": name },
          }),
    onSuccess: () => {
      setEdit(null);
      setName("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (q.data ?? []).filter((x) => !x.archived);
  const drag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const a = rows.findIndex((x) => x.id === e.active.id),
      b = rows.findIndex((x) => x.id === e.over!.id);
    void ordersApi
      .reorderStages(arrayMove(rows, a, b).map((x) => x.id))
      .then(refresh)
      .catch((x: Error) => toast.error(x.message));
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.stagesTitle}
      description={t.stagesDescription}
      wide
    >
      <DndContext onDragEnd={drag}>
        <SortableContext items={rows.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {rows.map((s) => (
              <StageRow
                key={s.id}
                stage={s}
                locale={locale}
                onEdit={(x) => {
                  setEdit(x);
                  setName(x.name);
                  setTranslations(x.translations ?? {});
                  setColor(x.color);
                  setCategory(x.category);
                  setIsInitial(x.isInitial);
                  setIsFinal(x.isFinal);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {(q.data ?? [])
        .filter((x) => x.archived)
        .map((stage) => (
          <div
            key={stage.id}
            className="mt-2 flex items-center gap-2 rounded-lg border border-dashed p-2 opacity-70"
          >
            <span className="flex-1 text-sm">{stageLabel(stage, locale)}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void ordersApi
                  .updateStage(stage.id, { archived: false, active: true })
                  .then(refresh)
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t.restore}
            </Button>
          </div>
        ))}
      <form
        className="mt-4 space-y-3 rounded-xl border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutate.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.namePt}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {(["en", "zh-CN", "zh-HK"] as const).map((key) => (
            <Field
              key={key}
              label={key === "en" ? t.nameEn : key === "zh-CN" ? t.nameZhCn : t.nameZhHk}
            >
              <Input
                value={translations[key] ?? ""}
                onChange={(e) => setTranslations({ ...translations, [key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label={t.category}>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as OrderStageDefinition["category"])}
            >
              {["OPEN", "IN_PROGRESS", "DONE", "ISSUE"].map((x) => (
                <option key={x} value={x}>
                  {orderEnumLabel(x, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.color}>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-5 text-sm">
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={isInitial}
              onChange={(e) => setIsInitial(e.target.checked)}
            />
            {t.initial}
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={isFinal}
              onChange={(e) => setIsFinal(e.target.checked)}
            />
            {t.final}
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={!name.trim() || mutate.isPending}>{edit ? t.save : t.addStage}</Button>
          {edit ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEdit(null);
                  setName("");
                }}
              >
                {t.cancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  void ordersApi
                    .updateStage(edit.id, { archived: true, active: false })
                    .then(() => {
                      setEdit(null);
                      refresh();
                    })
                    .catch((e: Error) => toast.error(e.message))
                }
              >
                {t.archive}
              </Button>
            </>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
export function OrderDetailPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  React.useEffect(() => router.replace(`/orders?order=${orderId}`), [orderId, router]);
  return <Skeleton className="h-48 w-full" />;
}
