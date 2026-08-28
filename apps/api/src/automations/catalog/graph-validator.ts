import { AUTOMATION_LIMITS } from "../domain/constants";
import type { WorkflowDefinition, WorkflowValidationIssue } from "../domain/definition";
import { getCatalogEntry, parseNodeType } from "./node-catalog";

const VISUAL = new Set(["visual.frame", "visual.note"]);

export function validateDefinition(definition: WorkflowDefinition): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  const nodes = definition.nodes ?? [];
  const edges = definition.edges ?? [];
  if (nodes.length > AUTOMATION_LIMITS.maxNodes) {
    issues.push({ level: "error", code: "MAX_NODES", message: `O fluxo ultrapassa o limite de ${AUTOMATION_LIMITS.maxNodes} etapas.` });
  }
  if (edges.length > AUTOMATION_LIMITS.maxEdges) {
    issues.push({ level: "error", code: "MAX_EDGES", message: "O fluxo possui conexões demais." });
  }
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!node.id || ids.has(node.id)) {
      issues.push({ level: "error", code: "NODE_ID", message: "Há etapas com identificador inválido ou duplicado.", nodeId: node.id });
    }
    ids.add(node.id);
    const entry = getCatalogEntry(node.type);
    if (!entry) {
      issues.push({ level: "error", code: "UNKNOWN_NODE", message: `Etapa desconhecida: ${node.type}.`, nodeId: node.id });
      continue;
    }
    for (const field of entry.requiredConfig ?? []) {
      const value = node.config?.[field];
      if (value == null || value === "") {
        issues.push({ level: "error", code: "REQUIRED_CONFIG", message: `${entry.label} precisa ser configurada.`, nodeId: node.id });
      }
    }
    const kind = parseNodeType(node.type).type;
    if ((kind === "logic.if" || kind === "logic.filter") && !Array.isArray(node.config?.items)) {
      issues.push({ level: "warning", code: "EMPTY_CONDITION", message: `${entry.label} ainda não tem uma condição. Sem critérios, o caminho Sim/continuar será sempre usado.`, nodeId: node.id });
    }
    if (kind === "logic.if") {
      const outs = edges.filter((edge) => edge.source === node.id).map((edge) => edge.sourceHandle ?? "out");
      if (!outs.includes("true") || !outs.includes("false")) {
        issues.push({ level: "warning", code: "INCOMPLETE_BRANCH", message: "Conecte os caminhos Sim e Não da condição.", nodeId: node.id });
      }
    }
    if (kind === "logic.waitForEvent") {
      const outs = edges.filter((edge) => edge.source === node.id).map((edge) => edge.sourceHandle ?? "out");
      if (!outs.includes("received") || !outs.includes("timeout")) {
        issues.push({ level: "warning", code: "INCOMPLETE_WAIT", message: "Conecte os caminhos Recebido e Timeout desta espera.", nodeId: node.id });
      }
    }
  }
  const executable = nodes.filter((node) => !VISUAL.has(parseNodeType(node.type).type));
  const triggers = executable.filter((node) => parseNodeType(node.type).type.startsWith("trigger."));
  if (!triggers.length) {
    issues.push({ level: "error", code: "NO_TRIGGER", message: "Adicione um gatilho para publicar esta automação." });
  }
  const incoming = new Map<string, number>();
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      issues.push({ level: "error", code: "DANGLING_EDGE", message: "Há uma conexão apontando para uma etapa inexistente." });
      continue;
    }
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }
  const reachable = new Set<string>();
  const start = triggers.map((node) => node.id);
  const stack = [...start];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const edge of edges) {
      if (edge.source === id) stack.push(edge.target);
    }
  }
  for (const node of executable) {
    if (!reachable.has(node.id) && !parseNodeType(node.type).type.startsWith("trigger.")) {
      issues.push({ level: "warning", code: "UNREACHABLE", message: "Esta etapa não está ligada ao gatilho.", nodeId: node.id });
    }
  }
  if (hasCycle(executable.map((node) => node.id), edges)) {
    issues.push({ level: "error", code: "CYCLE", message: "O fluxo possui um ciclo. Use a etapa Repetir para cada em vez de conectar o final ao início." });
  }
  return issues;
}

function hasCycle(nodeIds: string[], edges: WorkflowDefinition["edges"]) {
  const graph = new Map<string, string[]>();
  for (const id of nodeIds) graph.set(id, []);
  for (const edge of edges) graph.get(edge.source)?.push(edge.target);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of graph.get(id) ?? []) {
      if (walk(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return nodeIds.some((id) => walk(id));
}

export function checksumDefinition(definition: WorkflowDefinition) {
  return Buffer.from(JSON.stringify(definition)).toString("base64url").slice(0, 48);
}
