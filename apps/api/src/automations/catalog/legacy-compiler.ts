import type { AutomationAction, AutomationCondition, AutomationConfig } from "../automation-engine.types";
import { emptyDefinition, type WorkflowDefinition } from "../domain/definition";

export function compileLegacyConfig(triggerType: string, config: AutomationConfig): WorkflowDefinition {
  const definition = emptyDefinition();
  const triggerId = "legacy-trigger";
  definition.nodes.push({
    id: triggerId,
    type: triggerType === "DEAL_STAGE_CHANGED" ? "trigger.deal.stageChanged@1" : "trigger.deal.created@1",
    label: triggerType === "DEAL_STAGE_CHANGED" ? "Quando o lead mudar de etapa" : "Quando um lead for criado",
    position: { x: 80, y: 80 },
    config: config.triggerConfig ?? {},
  });
  let previous = triggerId;
  let y = 200;
  if (config.conditions?.length) {
    const filterId = "legacy-filter";
    definition.nodes.push({
      id: filterId,
      type: "logic.filter@1",
      label: "Filtro",
      position: { x: 80, y },
      config: { logic: "AND", items: config.conditions },
    });
    definition.edges.push({ id: "e-trigger-filter", source: previous, target: filterId, sourceHandle: "out" });
    previous = filterId;
    y += 120;
  }
  (config.actions ?? []).forEach((action, index) => {
    const id = `legacy-action-${index}`;
    definition.nodes.push({
      id,
      type: mapLegacyAction(action),
      label: action.type,
      position: { x: 80, y },
      config: action.config ?? {},
    });
    definition.edges.push({ id: `e-${previous}-${id}`, source: previous, target: id, sourceHandle: previous === triggerId ? "out" : "out" });
    previous = id;
    y += 120;
  });
  return definition;
}

function mapLegacyAction(action: AutomationAction) {
  switch (action.type) {
    case "CREATE_TASK":
      return "action.task.create@1";
    case "MOVE_STAGE":
      return "action.deal.moveStage@1";
    case "ASSIGN_OWNER":
      return "action.deal.assignOwner@1";
    case "ADD_TAG":
      return "action.deal.addTag@1";
    case "CREATE_NOTIFICATION":
      return "action.notify.user@1";
    default:
      return "logic.stop@1";
  }
}

export function readLegacyConfig(value: unknown): AutomationConfig {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    triggerConfig: raw.triggerConfig && typeof raw.triggerConfig === "object" && !Array.isArray(raw.triggerConfig)
      ? (raw.triggerConfig as AutomationConfig["triggerConfig"])
      : {},
    conditions: Array.isArray(raw.conditions) ? (raw.conditions as AutomationCondition[]) : [],
    actions: Array.isArray(raw.actions) ? (raw.actions as AutomationAction[]) : [],
  };
}
