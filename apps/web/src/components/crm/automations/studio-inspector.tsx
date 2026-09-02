"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { connectionsApi, pipelineStagesApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AutomationNodeCatalogItem,
  ConnectionListItem,
  Pipeline,
  PipelineStage,
  WorkflowDefinition,
} from "@/lib/types";

const OPERATORS: Array<[string, string]> = [
  ["EQUALS", "é igual a"],
  ["NOT_EQUALS", "é diferente de"],
  ["CONTAINS", "contém"],
  ["NOT_CONTAINS", "não contém"],
  ["STARTS_WITH", "começa com"],
  ["ENDS_WITH", "termina com"],
  ["GREATER_THAN", "maior que"],
  ["LESS_THAN", "menor que"],
  ["GREATER_OR_EQUAL", "maior ou igual"],
  ["LESS_OR_EQUAL", "menor ou igual"],
  ["IS_EMPTY", "está vazio"],
  ["IS_NOT_EMPTY", "não está vazio"],
  ["IS_ANY_OF", "é um de"],
  ["IS_NONE_OF", "não é nenhum de"],
  ["BEFORE", "antes de"],
  ["AFTER", "depois de"],
];

const DATA_PATHS = [
  ["current.contact.firstName", "Contato · primeiro nome"],
  ["current.contact.name", "Contato · nome"],
  ["current.contact.phone", "Contato · telefone"],
  ["current.contact.email", "Contato · e-mail"],
  ["current.contact.whatsapp", "Contato · WhatsApp"],
  ["current.contact.company.name", "Empresa · nome"],
  ["current.deal.id", "Lead · ID"],
  ["current.deal.value", "Lead · valor"],
  ["current.deal.stageId", "Lead · etapa"],
  ["current.deal.ownerId", "Lead · responsável"],
  ["current.deal.owner.name", "Lead · nome do responsável"],
  ["current.deal.pipeline.name", "Lead · pipeline"],
  ["current.deal.stage.name", "Lead · nome da etapa"],
  ["current.order.number", "Pedido · número"],
  ["current.order.status", "Pedido · status"],
  ["current.order.total", "Pedido · total"],
  ["current.order.paymentLink", "Pedido · link de pagamento"],
  ["current.order.trackingCode", "Pedido · código de rastreio"],
  ["nodes.findDuplicates.output.found", "Duplicados · encontrado"],
  ["nodes.findDuplicates.output.belongsToOtherOwner", "Duplicados · outra vendedora"],
];

const FRAME_COLORS = [
  { value: "#7c3aed", label: "Roxo" },
  { value: "#2563eb", label: "Azul" },
  { value: "#0891b2", label: "Ciano" },
  { value: "#059669", label: "Verde" },
  { value: "#d97706", label: "Âmbar" },
  { value: "#e11d48", label: "Rosa" },
] as const;

type ConditionItem = { field: string; operator: string; value?: unknown };

type SelectOption = { value: string; label: React.ReactNode; disabled: boolean };

function selectOptions(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      selectOptions((child.props as { children?: React.ReactNode }).children).forEach((option) =>
        options.push(option),
      );
      return;
    }
    if (child.type !== "option") return;
    const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
    const textValue =
      typeof props.children === "string" || typeof props.children === "number"
        ? String(props.children)
        : "";
    options.push({
      value: String(props.value ?? textValue),
      label: props.children,
      disabled: Boolean(props.disabled),
    });
  });
  return options;
}

function Select({
  children,
  className,
  value,
  disabled,
  onChange,
  "aria-label": ariaLabel,
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [open, setOpen] = React.useState(false);
  const options = React.useMemo(() => selectOptions(children), [children]);
  const currentValue = String(value ?? "");
  const selected = options.find((option) => option.value === currentValue);
  const choose = (nextValue: string) => {
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  return (
    <div
      className="nodrag nopan relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))] px-3 text-left text-sm text-[hsl(var(--automation-text))] outline-none transition-[border-color,box-shadow] hover:border-[hsl(var(--automation-accent)/0.55)] focus-visible:border-[hsl(var(--automation-accent))] focus-visible:shadow-[0_0_0_3px_hsl(var(--automation-accent)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--automation-surface-2))] disabled:text-[hsl(var(--automation-text-2))] disabled:opacity-70",
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? "Selecione"}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-[hsl(var(--automation-accent))] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[80] mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-[hsl(var(--automation-border-selected)/0.55)] bg-[hsl(var(--automation-surface))] p-1.5 shadow-[0_18px_42px_hsl(var(--automation-canvas)/0.78)]"
        >
          {options.map((option) => {
            const active = option.value === currentValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                onClick={() => choose(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                  active
                    ? "bg-[hsl(var(--automation-accent)/0.18)] text-[hsl(var(--automation-text))]"
                    : "text-[hsl(var(--automation-text-2))] hover:bg-[hsl(var(--automation-accent)/0.1)] hover:text-[hsl(var(--automation-text))]",
                  option.disabled && "cursor-not-allowed opacity-45",
                )}
              >
                <span className="truncate">{option.label}</span>
                {active ? <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-[hsl(var(--automation-accent))]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function NodeInspector({
  node,
  catalog,
  pipelines,
  users,
  tags,
  onChange,
  embedded = false,
}: {
  node: WorkflowDefinition["nodes"][number];
  catalog: AutomationNodeCatalogItem[];
  pipelines: Pipeline[];
  users: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  onChange: (node: WorkflowDefinition["nodes"][number]) => void;
  embedded?: boolean;
}) {
  const kind = node.type.replace(/@\d+$/, "");
  const entry = catalog.find((item) => item.id === node.type || item.type === kind);
  const pipelineId = String(node.config?.pipelineId ?? "");
  const stages = useQuery({
    queryKey: ["pipelines", pipelineId, "automation-stages"],
    queryFn: () => pipelineStagesApi.list(pipelineId),
    enabled: Boolean(pipelineId),
  });
  const connections = useQuery({
    queryKey: ["connections", "automation-whatsapp"],
    queryFn: () => connectionsApi.list(),
    enabled: kind === "action.whatsapp.send",
  });
  const setConfig = (key: string, value: unknown) =>
    onChange({ ...node, config: { ...node.config, [key]: value } });
  const conditions = (
    Array.isArray(node.config?.items) ? node.config.items : []
  ) as ConditionItem[];

  return (
    <div
      className={cn(
        "space-y-4",
        !embedded &&
          kind !== "action.deal.moveStage" &&
          "rounded-2xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface)/0.96)] p-4 shadow-[0_20px_55px_hsl(var(--automation-canvas)/0.5)]",
      )}
    >
      {!embedded && kind !== "action.deal.moveStage" ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--automation-text-2))]">Nome</Label>
            <Input
              value={node.label ?? ""}
              onChange={(event) => onChange({ ...node, label: event.target.value })}
            />
          </div>
          <p className="text-xs leading-5 text-[hsl(var(--automation-text-2))]">
            {entry?.description}
          </p>
        </>
      ) : null}

      {kind === "visual.frame" ? (
        <div className="space-y-2">
          <Label className="text-[hsl(var(--automation-text-2))]">Cor do quadro</Label>
          <div className="flex flex-wrap gap-2">
            {FRAME_COLORS.map((color) => {
              const active = (node.config?.color ?? "#7c3aed") === color.value;
              return (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  aria-label={`Usar cor ${color.label}`}
                  aria-pressed={active}
                  onClick={() => setConfig("color", color.value)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 border-[hsl(var(--automation-surface))] transition-transform hover:scale-110",
                    active && "ring-2 ring-[hsl(var(--automation-text))] ring-offset-2 ring-offset-[hsl(var(--automation-surface))]",
                  )}
                  style={{ backgroundColor: color.value }}
                />
              );
            })}
          </div>
          <p className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">
            Selecione o quadro e arraste suas bordas para redimensionar.
          </p>
        </div>
      ) : null}

      {kind === "action.deal.moveStage" ? (
        <div className="space-y-2 rounded-2xl border border-[hsl(var(--automation-accent)/0.4)] bg-gradient-to-br from-[hsl(var(--automation-accent)/0.13)] to-[hsl(var(--automation-surface-2)/0.96)] p-3 shadow-[0_16px_38px_hsl(var(--automation-canvas)/0.35)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--automation-accent))]">
            Para onde
          </p>
          <Field label="Pipeline de destino">
            <Select
              className="border-[hsl(var(--automation-border))] !bg-[hsl(var(--automation-surface))] !text-[hsl(var(--automation-text))] disabled:!bg-[hsl(var(--automation-surface-2))] disabled:!text-[hsl(var(--automation-text-2))]"
              value={pipelineId}
              onChange={(event) =>
                onChange({
                  ...node,
                  config: { ...node.config, pipelineId: event.target.value, stageId: "" },
                })
              }
            >
              <option value="">Selecione o pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etapa de destino">
            <Select
              className="border-[hsl(var(--automation-border))] !bg-[hsl(var(--automation-surface))] !text-[hsl(var(--automation-text))] disabled:!bg-[hsl(var(--automation-surface-2))] disabled:!text-[hsl(var(--automation-text-2))]"
              value={String(node.config?.stageId ?? "")}
              disabled={!pipelineId}
              onChange={(event) => setConfig("stageId", event.target.value)}
            >
              <option value="">Selecione a etapa</option>
              {(stages.data ?? []).map((stage: PipelineStage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : (kind.includes("deal") || kind.includes("stageChanged")) &&
        kind !== "data.findDuplicates" ? (
        <div className="space-y-3">
          <Field label="Pipeline">
            <Select
              value={pipelineId}
              onChange={(event) => setConfig("pipelineId", event.target.value)}
            >
              <option value="">Selecione</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
          </Field>
          {kind.includes("moveStage") || kind.includes("stageChanged") ? (
            <Field label="Etapa">
              <Select
                value={String(node.config?.stageId ?? node.config?.toStageId ?? "")}
                onChange={(event) =>
                  setConfig(
                    kind.includes("moveStage") ? "stageId" : "toStageId",
                    event.target.value,
                  )
                }
              >
                <option value="">Selecione</option>
                {(stages.data ?? []).map((stage: PipelineStage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {kind === "logic.delay" ? (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Dias">
            <Input
              type="number"
              value={String(node.config?.durationDays ?? 0)}
              onChange={(event) => setConfig("durationDays", Number(event.target.value))}
            />
          </Field>
          <Field label="Horas">
            <Input
              type="number"
              value={String(node.config?.durationHours ?? 0)}
              onChange={(event) => setConfig("durationHours", Number(event.target.value))}
            />
          </Field>
          <Field label="Minutos">
            <Input
              type="number"
              value={String(node.config?.durationMinutes ?? 30)}
              onChange={(event) => setConfig("durationMinutes", Number(event.target.value))}
            />
          </Field>
        </div>
      ) : null}

      {kind === "trigger.schedule" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hora">
              <Input
                type="number"
                min="0"
                max="23"
                value={String(node.config?.hour ?? 9)}
                onChange={(event) => setConfig("hour", event.target.value.padStart(2, "0"))}
              />
            </Field>
            <Field label="Minuto">
              <Input
                type="number"
                min="0"
                max="59"
                value={String(node.config?.minute ?? 0)}
                onChange={(event) => setConfig("minute", event.target.value.padStart(2, "0"))}
              />
            </Field>
          </div>
          <Field label="Dias da semana">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["Mon", "Seg"],
                  ["Tue", "Ter"],
                  ["Wed", "Qua"],
                  ["Thu", "Qui"],
                  ["Fri", "Sex"],
                  ["Sat", "Sáb"],
                  ["Sun", "Dom"],
                ] as const
              ).map(([value, label]) => {
                const selectedDays = Array.isArray(node.config?.weekdays)
                  ? (node.config.weekdays as string[])
                  : ["Mon", "Tue", "Wed", "Thu", "Fri"];
                const activeDay = selectedDays.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setConfig(
                        "weekdays",
                        activeDay
                          ? selectedDays.filter((day) => day !== value)
                          : [...selectedDays, value],
                      )
                    }
                    className={`rounded-md border px-2 py-1 text-[11px] ${activeDay ? "border-[hsl(var(--automation-accent))] bg-[hsl(var(--automation-accent)/0.12)]" : "border-[hsl(var(--automation-border))]"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>
          <p className="text-[11px] text-[hsl(var(--automation-text-2))]">
            Horário de Brasília (America/São_Paulo).
          </p>
        </div>
      ) : null}

      {kind === "trigger.deal.tagAdded" || kind === "trigger.deal.tagRemoved" ? (
        <Field label="Tag">
          <Select
            value={String(node.config?.tagId ?? "")}
            onChange={(event) => setConfig("tagId", event.target.value)}
          >
            <option value="">Qualquer tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {kind === "trigger.deal.fieldChanged" || kind === "trigger.contact.fieldChanged" ? (
        <>
          <Field label="Campo observado">
            <Select
              value={String(node.config?.field ?? "")}
              onChange={(event) => setConfig("field", event.target.value)}
            >
              <option value="">Selecione o campo</option>
              {(kind === "trigger.deal.fieldChanged"
                ? [["name", "Nome"], ["value", "Valor"], ["priority", "Prioridade"], ["status", "Status"], ["source", "Origem"], ["campaign", "Campanha"], ["lostReason", "Motivo da perda"]]
                : [["firstName", "Nome"], ["lastName", "Sobrenome"], ["phone", "Telefone"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["city", "Cidade"], ["state", "Estado"], ["status", "Status"], ["source", "Origem"], ["campaign", "Campanha"], ["nextContactAt", "Próximo contato"]]
              ).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <ExpressionField
            label="Novo valor (opcional)"
            value={String(node.config?.toValue ?? "")}
            onChange={(value) => setConfig("toValue", value || undefined)}
          />
        </>
      ) : null}

      {kind === "logic.waitForEvent" ? (
        <>
          <Field label="Evento">
            <Select
              value={String(node.config?.eventType ?? "order.payment.confirmed")}
              onChange={(event) => setConfig("eventType", event.target.value)}
            >
              <option value="order.payment.confirmed">Pagamento confirmado</option>
              <option value="message.received">Mensagem recebida</option>
              <option value="deal.stage.changed">Lead mudou de etapa</option>
            </Select>
          </Field>
          <Field label="Timeout (minutos)">
            <Input
              type="number"
              value={String(node.config?.timeoutMinutes ?? 60)}
              onChange={(event) => setConfig("timeoutMinutes", Number(event.target.value))}
            />
          </Field>
          <p className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">
            Se o evento não chegar neste período, a automação segue pelo caminho Timeout.
          </p>
        </>
      ) : null}

      {kind === "action.deal.assignOwner" ? (
        <>
          <Field label="Modo">
            <Select
              value={String(node.config?.mode ?? "specific")}
              onChange={(event) => setConfig("mode", event.target.value)}
            >
              <option value="specific">Usuário específico</option>
              <option value="channelOwner">Proprietário do canal</option>
              <option value="keep">Manter atual</option>
            </Select>
          </Field>
          {node.config?.mode !== "channelOwner" && node.config?.mode !== "keep" ? (
            <Field label="Responsável">
              <Select
                value={String(node.config?.ownerId ?? "")}
                onChange={(event) => setConfig("ownerId", event.target.value)}
              >
                <option value="">Selecione</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </>
      ) : null}

      {kind === "action.deal.assignRoundRobin" ? (
        <p className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">
          O próximo responsável será o usuário ativo com menos leads abertos. Empates são resolvidos de forma estável.
        </p>
      ) : null}

      {kind === "action.deal.updateField" || kind === "action.contact.updateField" ? (
        <>
          <Field label="Campo para atualizar">
            <Select
              value={String(node.config?.field ?? "")}
              onChange={(event) => setConfig("field", event.target.value)}
            >
              <option value="">Selecione o campo</option>
              {(kind === "action.deal.updateField"
                ? [["name", "Nome"], ["value", "Valor"], ["priority", "Prioridade"], ["status", "Status"], ["source", "Origem"], ["campaign", "Campanha"], ["lostReason", "Motivo da perda"]]
                : [["firstName", "Nome"], ["lastName", "Sobrenome"], ["phone", "Telefone"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["city", "Cidade"], ["state", "Estado"], ["country", "País"], ["status", "Status"], ["source", "Origem"], ["campaign", "Campanha"], ["observations", "Observações"], ["nextContactAt", "Próximo contato"]]
              ).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <ExpressionField
            label="Novo valor"
            value={String(node.config?.value ?? "")}
            onChange={(value) => setConfig("value", value)}
          />
        </>
      ) : null}

      {kind === "action.deal.addTag" || kind === "action.deal.removeTag" ? (
        <Field label="Tag">
          <Select
            value={String(node.config?.tagId ?? "")}
            onChange={(event) => setConfig("tagId", event.target.value)}
          >
            <option value="">Selecione</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {kind === "data.findDuplicates" ? (
        <>
          <label className="flex items-center gap-2 text-xs text-[hsl(var(--automation-text-2))]">
            <input
              type="checkbox"
              checked={node.config?.ignoreAfterSales !== false}
              onChange={(event) => setConfig("ignoreAfterSales", event.target.checked)}
            />
            Ignorar área de pós-venda
          </label>
          <p className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">
            Compara telefone e e-mail. O resultado `found` e `belongsToOtherOwner` fica disponível
            para a próxima condição.
          </p>
        </>
      ) : null}

      {kind === "action.whatsapp.send" ? (
        <>
          <Field label="Canal">
            <Select
              value={String(node.config?.connectionId ?? "")}
              onChange={(event) => setConfig("connectionId", event.target.value)}
            >
              <option value="">Selecione um canal</option>
              {(connections.data ?? []).map((connection: ConnectionListItem) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                  {connection.status !== "CONNECTED" ? " · desconectado" : ""}
                </option>
              ))}
            </Select>
          </Field>
          {!((connections.data ?? []) as ConnectionListItem[]).length ? (
            <p className="text-[11px] text-[hsl(var(--automation-warning))]">
              Requer conexão. Abra Conexões para autenticar um canal antes de publicar.
            </p>
          ) : null}
          <ExpressionField
            label="Mensagem"
            value={String(node.config?.body ?? "")}
            onChange={(value) => setConfig("body", value)}
            large
          />
        </>
      ) : null}

      {kind === "action.task.create" ||
      kind === "action.notify.user" ||
      kind === "action.note.create" ? (
        <>
          {kind !== "action.note.create" ? (
            <ExpressionField
              label="Título"
              value={String(node.config?.title ?? "")}
              onChange={(value) => setConfig("title", value)}
              showPreview={kind !== "action.notify.user"}
            />
          ) : null}
          <ExpressionField
            label={kind === "action.note.create" ? "Nota" : "Texto"}
            value={String(node.config?.body ?? node.config?.description ?? "")}
            onChange={(value) =>
              setConfig(kind === "action.task.create" ? "description" : "body", value)
            }
            showPreview={kind !== "action.notify.user"}
          />
          {kind === "action.notify.user" ? (
            <Field label="Usuário">
              <Select
                value={String(node.config?.userId ?? "")}
                onChange={(event) => setConfig("userId", event.target.value)}
              >
                <option value="">Selecione</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </>
      ) : null}

      {kind === "action.http.request" ? (
        <>
          <Field label="Método">
            <Select
              value={String(node.config?.method ?? "POST")}
              onChange={(event) => setConfig("method", event.target.value)}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
                <option key={method}>{method}</option>
              ))}
            </Select>
          </Field>
          <Field label="URL">
            <Input
              value={String(node.config?.url ?? "")}
              onChange={(event) => setConfig("url", event.target.value)}
            />
          </Field>
        </>
      ) : null}

      {kind === "action.order.updateStatus" ? (
        <Field label="Novo status do pedido">
          <Select
            value={String(node.config?.status ?? "")}
            onChange={(event) => setConfig("status", event.target.value)}
          >
            <option value="">Selecione o status</option>
            <option value="PENDING">Pendente</option>
            <option value="PAYMENT_APPROVED">Pagamento aprovado</option>
            <option value="SEPARATING">Em separação</option>
            <option value="SHIPPED">Enviado</option>
            <option value="DELIVERED">Entregue</option>
            <option value="CANCELED">Cancelado</option>
          </Select>
        </Field>
      ) : null}

      {kind === "logic.randomSplit" ? (
        <Field label="Percentual do caminho A">
          <Input
            type="number"
            min="1"
            max="99"
            value={String(node.config?.percentageA ?? 50)}
            onChange={(event) =>
              setConfig("percentageA", Math.max(1, Math.min(99, Number(event.target.value))))
            }
          />
        </Field>
      ) : null}

      {kind === "logic.loop" ? (
        <>
          <Field label="Lista para repetir">
            <Input
              value={String(node.config?.listPath ?? "")}
              onChange={(event) => setConfig("listPath", event.target.value)}
              placeholder="current.order.items"
            />
          </Field>
          <Field label="Limite de itens">
            <Input
              type="number"
              min="1"
              max="100"
              value={String(node.config?.maxIterations ?? 20)}
              onChange={(event) => setConfig("maxIterations", Number(event.target.value))}
            />
          </Field>
        </>
      ) : null}

      {kind === "logic.if" || kind === "logic.filter" ? (
        <ConditionBuilder
          logic={String(node.config?.logic ?? "AND")}
          items={conditions}
          onLogic={(logic) => setConfig("logic", logic)}
          onItems={(items) => setConfig("items", items)}
        />
      ) : null}

      {kind === "logic.switch" ? (
        <SwitchBuilder
          field={String(node.config?.field ?? "")}
          cases={
            (Array.isArray(node.config?.cases) ? node.config.cases : []) as Array<{
              value: string;
              handle: string;
            }>
          }
          onChange={(field, cases) =>
            onChange({ ...node, config: { ...node.config, field, cases } })
          }
        />
      ) : null}

      {kind === "visual.note" ? (
        <Field label="Nota">
          <Textarea
            value={String(node.config?.text ?? node.label ?? "")}
            onChange={(event) =>
              onChange({
                ...node,
                label: event.target.value,
                config: { ...node.config, text: event.target.value },
              })
            }
          />
        </Field>
      ) : null}
    </div>
  );
}

function ConditionBuilder({
  logic,
  items,
  onLogic,
  onItems,
}: {
  logic: string;
  items: ConditionItem[];
  onLogic: (logic: string) => void;
  onItems: (items: ConditionItem[]) => void;
}) {
  const update = (index: number, patch: Partial<ConditionItem>) => {
    onItems(items.map((item, current) => (current === index ? { ...item, ...patch } : item)));
  };
  return (
    <div className="space-y-3">
      <Field label="Combinar">
        <Select value={logic} onChange={(event) => onLogic(event.target.value)}>
          <option value="AND">Todas as condições (E)</option>
          <option value="OR">Qualquer condição (OU)</option>
        </Select>
      </Field>
      {items.map((item, index) => (
        <div
          key={`${item.field}-${index}`}
          className="space-y-2 rounded-lg border border-[hsl(var(--automation-border))] p-2.5"
        >
          <Select
            value={item.field}
            onChange={(event) => update(index, { field: event.target.value })}
          >
            <option value="">Campo</option>
            {DATA_PATHS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            {item.field && !DATA_PATHS.some(([value]) => value === item.field) ? (
              <option value={item.field}>{item.field}</option>
            ) : null}
          </Select>
          <Select
            value={item.operator}
            onChange={(event) => update(index, { operator: event.target.value })}
          >
            {OPERATORS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {item.operator !== "IS_EMPTY" && item.operator !== "IS_NOT_EMPTY" ? (
            <Input
              value={String(item.value ?? "")}
              onChange={(event) => update(index, { value: event.target.value })}
              placeholder="Valor"
            />
          ) : null}
          <button
            type="button"
            className="text-[11px] text-[hsl(var(--automation-text-2))]"
            onClick={() => onItems(items.filter((_, current) => current !== index))}
          >
            Remover
          </button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="border-[hsl(var(--automation-border))] bg-transparent"
        onClick={() =>
          onItems([...items, { field: "current.deal.value", operator: "EQUALS", value: "" }])
        }
      >
        Adicionar condição
      </Button>
    </div>
  );
}

function SwitchBuilder({
  field,
  cases,
  onChange,
}: {
  field: string;
  cases: Array<{ value: string; handle: string }>;
  onChange: (field: string, cases: Array<{ value: string; handle: string }>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Campo">
        <Input
          value={field}
          onChange={(event) => onChange(event.target.value, cases)}
          placeholder="trigger.channel"
        />
      </Field>
      {cases.map((item, index) => (
        <div key={item.handle} className="grid grid-cols-2 gap-2">
          <Input
            value={item.value}
            onChange={(event) =>
              onChange(
                field,
                cases.map((row, current) =>
                  current === index ? { ...row, value: event.target.value } : row,
                ),
              )
            }
            placeholder="Valor"
          />
          <Input
            value={item.handle}
            onChange={(event) =>
              onChange(
                field,
                cases.map((row, current) =>
                  current === index ? { ...row, handle: event.target.value } : row,
                ),
              )
            }
            placeholder="caminho"
          />
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="border-[hsl(var(--automation-border))] bg-transparent"
        onClick={() =>
          onChange(field, [...cases, { value: "", handle: `path${cases.length + 1}` }])
        }
      >
        Adicionar caminho
      </Button>
      <p className="text-[11px] text-[hsl(var(--automation-text-2))]">
        Sempre existe um caminho Default para valores que não combinarem.
      </p>
    </div>
  );
}

function ExpressionField({
  label,
  value,
  onChange,
  large = false,
  showPreview = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  large?: boolean;
  showPreview?: boolean;
}) {
  const previewValues: Record<string, string> = {
    "current.contact.firstName": "Marina",
    "current.contact.name": "Marina Oliveira",
    "current.contact.phone": "+55 11 99999-9999",
    "current.contact.whatsapp": "+55 11 99999-9999",
    "current.contact.email": "marina@exemplo.com",
    "current.contact.company.name": "Loja Aurora",
    "current.deal.value": "R$ 2.490,00",
    "current.deal.stage.name": "Negociação",
    "current.deal.owner.name": "Amanda Souza",
    "current.deal.pipeline.name": "Comercial principal",
    "current.order.number": "XY-1048",
    "current.order.status": "Pagamento confirmado",
    "current.order.total": "R$ 2.490,00",
    "current.order.paymentLink": "https://pagamento.exemplo/XY-1048",
    "current.order.trackingCode": "BR123456789",
  };
  const preview = value.replace(
    /\{\{\s*([^}]+?)\s*\}\}/g,
    (_match, path: string) => previewValues[path] ?? `‹${path}›`,
  );
  return (
    <div className="space-y-1.5">
      <Label className="text-[hsl(var(--automation-text-2))]">{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Olá {{contact.firstName}}"
        className={cn(large && "min-h-[112px] resize-y")}
      />
      <Select
        value=""
        onChange={(event) => event.target.value && onChange(`${value}{{${event.target.value}}}`)}
      >
        <option value="">Inserir variável</option>
        {DATA_PATHS.map(([path, name]) => (
          <option key={path} value={path}>
            {name}
          </option>
        ))}
      </Select>
      {value && showPreview ? (
        <div className="overflow-hidden rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-canvas)/0.3)]">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface-2)/0.72)] px-3 py-2">
            <Eye className="h-3.5 w-3.5 text-[hsl(var(--automation-accent))]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--automation-text-2))]">
              Prévia da mensagem
            </p>
          </div>
          <div className="p-3">
            <div className="max-w-[92%] rounded-xl rounded-tl-sm border border-[hsl(var(--automation-accent)/0.2)] bg-[hsl(var(--automation-accent)/0.1)] px-3 py-2.5">
              <p className="whitespace-pre-wrap break-words text-xs leading-5 text-[hsl(var(--automation-text))]">
                {preview}
              </p>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[hsl(var(--automation-text-2)/0.75)]">
              Exemplo preenchido com dados fictícios
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[hsl(var(--automation-text-2))]">{label}</Label>
      {children}
    </div>
  );
}

export function WorkflowSettingsForm({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (settings: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Configurações da automação</p>
      <div className="space-y-1.5">
        <Label className="text-[hsl(var(--automation-text-2))]">Reentrada</Label>
        <Select
          value={String(settings.reentry ?? "skipIfActive")}
          onChange={(event) => onChange({ ...settings, reentry: event.target.value })}
        >
          <option value="always">Executar sempre</option>
          <option value="once">Uma vez por registro</option>
          <option value="skipIfActive">Não executar se já houver execução ativa</option>
          <option value="replace">Substituir execução anterior</option>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-xs text-[hsl(var(--automation-text-2))]">
        <input
          type="checkbox"
          checked={Boolean(settings.allowAutomationReentry)}
          onChange={(event) =>
            onChange({ ...settings, allowAutomationReentry: event.target.checked })
          }
        />
        Permitir que esta automação reaja a alterações feitas por ela mesma
      </label>
    </div>
  );
}
