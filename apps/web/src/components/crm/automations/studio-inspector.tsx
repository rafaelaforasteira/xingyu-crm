"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { connectionsApi, pipelineStagesApi } from "@/lib/api";
import type { AutomationNodeCatalogItem, ConnectionListItem, Pipeline, PipelineStage, WorkflowDefinition } from "@/lib/types";

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
  ["current.deal.id", "Lead · ID"],
  ["current.deal.value", "Lead · valor"],
  ["current.deal.stageId", "Lead · etapa"],
  ["current.deal.ownerId", "Lead · responsável"],
  ["current.order.number", "Pedido · número"],
  ["current.order.status", "Pedido · status"],
  ["current.order.total", "Pedido · total"],
  ["nodes.findDuplicates.output.found", "Duplicados · encontrado"],
  ["nodes.findDuplicates.output.belongsToOtherOwner", "Duplicados · outra vendedora"],
];

type ConditionItem = { field: string; operator: string; value?: unknown };

export function NodeInspector({
  node,
  catalog,
  pipelines,
  users,
  tags,
  onChange,
}: {
  node: WorkflowDefinition["nodes"][number];
  catalog: AutomationNodeCatalogItem[];
  pipelines: Pipeline[];
  users: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  onChange: (node: WorkflowDefinition["nodes"][number]) => void;
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
  const setConfig = (key: string, value: unknown) => onChange({ ...node, config: { ...node.config, [key]: value } });
  const conditions = (Array.isArray(node.config?.items) ? node.config.items : []) as ConditionItem[];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[hsl(var(--automation-text-2))]">Nome</Label>
        <Input value={node.label ?? ""} onChange={(event) => onChange({ ...node, label: event.target.value })} />
      </div>
      <p className="text-xs leading-5 text-[hsl(var(--automation-text-2))]">{entry?.description}</p>

      {(kind.includes("deal") || kind.includes("moveStage") || kind.includes("stageChanged")) && kind !== "data.findDuplicates" ? (
        <div className="space-y-3">
          <Field label="Pipeline">
            <Select value={pipelineId} onChange={(event) => setConfig("pipelineId", event.target.value)}>
              <option value="">Selecione</option>
              {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
            </Select>
          </Field>
          {kind.includes("moveStage") || kind.includes("stageChanged") ? (
            <Field label="Etapa">
              <Select value={String(node.config?.stageId ?? node.config?.toStageId ?? "")} onChange={(event) => setConfig(kind.includes("moveStage") ? "stageId" : "toStageId", event.target.value)}>
                <option value="">Selecione</option>
                {(stages.data ?? []).map((stage: PipelineStage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </Select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {kind === "logic.delay" ? (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Dias"><Input type="number" value={String(node.config?.durationDays ?? 0)} onChange={(event) => setConfig("durationDays", Number(event.target.value))} /></Field>
          <Field label="Horas"><Input type="number" value={String(node.config?.durationHours ?? 0)} onChange={(event) => setConfig("durationHours", Number(event.target.value))} /></Field>
          <Field label="Minutos"><Input type="number" value={String(node.config?.durationMinutes ?? 30)} onChange={(event) => setConfig("durationMinutes", Number(event.target.value))} /></Field>
        </div>
      ) : null}

      {kind === "logic.waitForEvent" ? (
        <>
          <Field label="Evento">
            <Select value={String(node.config?.eventType ?? "order.payment.confirmed")} onChange={(event) => setConfig("eventType", event.target.value)}>
              <option value="order.payment.confirmed">Pagamento confirmado</option>
              <option value="message.received">Mensagem recebida</option>
              <option value="deal.stage.changed">Lead mudou de etapa</option>
            </Select>
          </Field>
          <Field label="Timeout (minutos)">
            <Input type="number" value={String(node.config?.timeoutMinutes ?? 60)} onChange={(event) => setConfig("timeoutMinutes", Number(event.target.value))} />
          </Field>
          <p className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">Se o evento não chegar neste período, a automação segue pelo caminho Timeout.</p>
        </>
      ) : null}

      {kind === "action.deal.assignOwner" ? (
        <>
          <Field label="Modo">
            <Select value={String(node.config?.mode ?? "specific")} onChange={(event) => setConfig("mode", event.target.value)}>
              <option value="specific">Usuário específico</option>
              <option value="channelOwner">Proprietário do canal</option>
              <option value="keep">Manter atual</option>
            </Select>
          </Field>
          {node.config?.mode !== "channelOwner" && node.config?.mode !== "keep" ? (
            <Field label="Responsável">
              <Select value={String(node.config?.ownerId ?? "")} onChange={(event) => setConfig("ownerId", event.target.value)}>
                <option value="">Selecione</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </Select>
            </Field>
          ) : null}
        </>
      ) : null}

      {kind === "action.deal.addTag" || kind === "action.deal.removeTag" ? (
        <Field label="Tag">
          <Select value={String(node.config?.tagId ?? "")} onChange={(event) => setConfig("tagId", event.target.value)}>
            <option value="">Selecione</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </Select>
        </Field>
      ) : null}

      {kind === "data.findDuplicates" ? (
        <>
          <label className="flex items-center gap-2 text-xs text-[hsl(var(--automation-text-2))]">
            <input type="checkbox" checked={node.config?.ignoreAfterSales !== false} onChange={(event) => setConfig("ignoreAfterSales", event.target.checked)} />
            Ignorar área de pós-venda
          </label>
          <p className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">Compara telefone e e-mail. O resultado `found` e `belongsToOtherOwner` fica disponível para a próxima condição.</p>
        </>
      ) : null}

      {kind === "action.whatsapp.send" ? (
        <>
          <Field label="Canal">
            <Select value={String(node.config?.connectionId ?? "")} onChange={(event) => setConfig("connectionId", event.target.value)}>
              <option value="">Selecione um canal</option>
              {(connections.data ?? []).map((connection: ConnectionListItem) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}{connection.status !== "CONNECTED" ? " · desconectado" : ""}
                </option>
              ))}
            </Select>
          </Field>
          {!((connections.data ?? []) as ConnectionListItem[]).length ? (
            <p className="text-[11px] text-[hsl(var(--automation-warning))]">Requer conexão. Abra Conexões para autenticar um canal antes de publicar.</p>
          ) : null}
          <ExpressionField label="Mensagem" value={String(node.config?.body ?? "")} onChange={(value) => setConfig("body", value)} />
        </>
      ) : null}

      {kind === "action.task.create" || kind === "action.notify.user" || kind === "action.note.create" ? (
        <>
          {kind !== "action.note.create" ? (
            <ExpressionField label="Título" value={String(node.config?.title ?? "")} onChange={(value) => setConfig("title", value)} />
          ) : null}
          <ExpressionField
            label={kind === "action.note.create" ? "Nota" : "Texto"}
            value={String(node.config?.body ?? node.config?.description ?? "")}
            onChange={(value) => setConfig(kind === "action.task.create" ? "description" : "body", value)}
          />
          {kind === "action.notify.user" ? (
            <Field label="Usuário">
              <Select value={String(node.config?.userId ?? "")} onChange={(event) => setConfig("userId", event.target.value)}>
                <option value="">Selecione</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </Select>
            </Field>
          ) : null}
        </>
      ) : null}

      {kind === "action.http.request" ? (
        <>
          <Field label="Método">
            <Select value={String(node.config?.method ?? "POST")} onChange={(event) => setConfig("method", event.target.value)}>
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => <option key={method}>{method}</option>)}
            </Select>
          </Field>
          <Field label="URL">
            <Input value={String(node.config?.url ?? "")} onChange={(event) => setConfig("url", event.target.value)} />
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
          cases={(Array.isArray(node.config?.cases) ? node.config.cases : []) as Array<{ value: string; handle: string }>}
          onChange={(field, cases) => onChange({ ...node, config: { ...node.config, field, cases } })}
        />
      ) : null}

      {kind === "visual.note" ? (
        <Field label="Nota">
          <Textarea value={String(node.config?.text ?? node.label ?? "")} onChange={(event) => onChange({ ...node, label: event.target.value, config: { ...node.config, text: event.target.value } })} />
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
        <div key={`${item.field}-${index}`} className="space-y-2 rounded-lg border border-[hsl(var(--automation-border))] p-2.5">
          <Select value={item.field} onChange={(event) => update(index, { field: event.target.value })}>
            <option value="">Campo</option>
            {DATA_PATHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            {item.field && !DATA_PATHS.some(([value]) => value === item.field) ? <option value={item.field}>{item.field}</option> : null}
          </Select>
          <Select value={item.operator} onChange={(event) => update(index, { operator: event.target.value })}>
            {OPERATORS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          {item.operator !== "IS_EMPTY" && item.operator !== "IS_NOT_EMPTY" ? (
            <Input value={String(item.value ?? "")} onChange={(event) => update(index, { value: event.target.value })} placeholder="Valor" />
          ) : null}
          <button type="button" className="text-[11px] text-[hsl(var(--automation-text-2))]" onClick={() => onItems(items.filter((_, current) => current !== index))}>Remover</button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="border-[hsl(var(--automation-border))] bg-transparent"
        onClick={() => onItems([...items, { field: "current.deal.value", operator: "EQUALS", value: "" }])}
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
        <Input value={field} onChange={(event) => onChange(event.target.value, cases)} placeholder="trigger.channel" />
      </Field>
      {cases.map((item, index) => (
        <div key={item.handle} className="grid grid-cols-2 gap-2">
          <Input value={item.value} onChange={(event) => onChange(field, cases.map((row, current) => (current === index ? { ...row, value: event.target.value } : row)))} placeholder="Valor" />
          <Input value={item.handle} onChange={(event) => onChange(field, cases.map((row, current) => (current === index ? { ...row, handle: event.target.value } : row)))} placeholder="caminho" />
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="border-[hsl(var(--automation-border))] bg-transparent"
        onClick={() => onChange(field, [...cases, { value: "", handle: `path${cases.length + 1}` }])}
      >
        Adicionar caminho
      </Button>
      <p className="text-[11px] text-[hsl(var(--automation-text-2))]">Sempre existe um caminho Default para valores que não combinarem.</p>
    </div>
  );
}

function ExpressionField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[hsl(var(--automation-text-2))]">{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="Olá {{contact.firstName}}" />
      <Select value="" onChange={(event) => event.target.value && onChange(`${value}{{${event.target.value}}}`)}>
        <option value="">Inserir variável</option>
        {DATA_PATHS.map(([path, name]) => <option key={path} value={path}>{name}</option>)}
      </Select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-[hsl(var(--automation-text-2))]">{label}</Label>{children}</div>;
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
        <Select value={String(settings.reentry ?? "skipIfActive")} onChange={(event) => onChange({ ...settings, reentry: event.target.value })}>
          <option value="always">Executar sempre</option>
          <option value="once">Uma vez por registro</option>
          <option value="skipIfActive">Não executar se já houver execução ativa</option>
          <option value="replace">Substituir execução anterior</option>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-xs text-[hsl(var(--automation-text-2))]">
        <input type="checkbox" checked={Boolean(settings.allowAutomationReentry)} onChange={(event) => onChange({ ...settings, allowAutomationReentry: event.target.checked })} />
        Permitir que esta automação reaja a alterações feitas por ela mesma
      </label>
    </div>
  );
}
