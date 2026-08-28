export type NodeCategory =
  | "triggers"
  | "logic"
  | "time"
  | "data"
  | "crm"
  | "communication"
  | "integrations"
  | "ai"
  | "advanced"
  | "visual";

export interface NodeCatalogEntry {
  type: string;
  version: number;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  executable: boolean;
  eventType?: string;
  handles: { inputs: string[]; outputs: string[] };
  requiredConfig?: string[];
}

export const NODE_CATALOG: NodeCatalogEntry[] = [
  { type: "trigger.deal.created", version: 1, category: "triggers", label: "Quando um lead for criado", description: "Inicia quando um negócio entra no CRM.", icon: "sparkles", executable: true, eventType: "deal.created", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.deal.stageChanged", version: 1, category: "triggers", label: "Quando o lead mudar de etapa", description: "Inicia quando o negócio entra em uma etapa.", icon: "git-branch", executable: true, eventType: "deal.stage.changed", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.deal.ownerChanged", version: 1, category: "triggers", label: "Quando o responsável for alterado", description: "Inicia quando o dono do lead muda.", icon: "user-round-cog", executable: true, eventType: "deal.owner.changed", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.contact.created", version: 1, category: "triggers", label: "Quando um contato for criado", description: "Inicia na criação de um contato.", icon: "contact", executable: true, eventType: "contact.created", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.order.created", version: 1, category: "triggers", label: "Quando um pedido for criado", description: "Inicia na criação de um pedido ou carrinho.", icon: "package", executable: true, eventType: "order.created", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.order.statusChanged", version: 1, category: "triggers", label: "Quando o status do pedido mudar", description: "Inicia na mudança de status operacional.", icon: "list-tree", executable: true, eventType: "order.status.changed", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.order.paymentConfirmed", version: 1, category: "triggers", label: "Quando o pagamento for confirmado", description: "Inicia no pagamento aprovado.", icon: "circle-dollar-sign", executable: true, eventType: "order.payment.confirmed", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.order.paymentFailed", version: 1, category: "triggers", label: "Quando o pagamento falhar", description: "Inicia em recusa ou cancelamento de pagamento.", icon: "circle-off", executable: true, eventType: "order.payment.failed", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.message.received", version: 1, category: "triggers", label: "Quando uma mensagem for recebida", description: "Inicia em mensagem inbound real.", icon: "message-circle", executable: true, eventType: "message.received", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.connection.connected", version: 1, category: "triggers", label: "Quando um canal conectar", description: "Inicia ao conectar um canal.", icon: "plug", executable: true, eventType: "connection.connected", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.connection.disconnected", version: 1, category: "triggers", label: "Quando um canal desconectar", description: "Inicia ao desconectar um canal.", icon: "unplug", executable: true, eventType: "connection.disconnected", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.task.created", version: 1, category: "triggers", label: "Quando uma tarefa for criada", description: "Inicia na criação de tarefa.", icon: "check-square", executable: true, eventType: "task.created", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.task.completed", version: 1, category: "triggers", label: "Quando uma tarefa for concluída", description: "Inicia ao concluir uma tarefa.", icon: "check-check", executable: true, eventType: "task.completed", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.webhook.received", version: 1, category: "triggers", label: "Quando um webhook for recebido", description: "Inicia por um endpoint seguro desta automação.", icon: "webhook", executable: true, eventType: "webhook.received", handles: { inputs: [], outputs: ["out"] } },
  { type: "trigger.manual", version: 1, category: "triggers", label: "Execução manual", description: "Inicia somente quando alguém executar.", icon: "play", executable: true, eventType: "manual.run", handles: { inputs: [], outputs: ["out"] } },
  { type: "logic.filter", version: 1, category: "logic", label: "Filtro", description: "Continua somente se a condição for verdadeira.", icon: "filter", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "logic.if", version: 1, category: "logic", label: "Se / Então", description: "Separa o fluxo em Sim e Não.", icon: "git-fork", executable: true, handles: { inputs: ["in"], outputs: ["true", "false"] } },
  { type: "logic.switch", version: 1, category: "logic", label: "Caminhos", description: "Encaminha por valor, com caminho padrão.", icon: "split", executable: true, handles: { inputs: ["in"], outputs: ["default"] } },
  { type: "logic.randomSplit", version: 1, category: "advanced", label: "Divisão aleatória", description: "Distribui execuções por percentual.", icon: "dices", executable: true, handles: { inputs: ["in"], outputs: ["a", "b"] } },
  { type: "logic.merge", version: 1, category: "logic", label: "Unir caminhos", description: "Junta ramos do fluxo.", icon: "merge", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "logic.loop", version: 1, category: "advanced", label: "Repetir para cada", description: "Percorre uma lista com limite de iterações.", icon: "repeat", executable: true, handles: { inputs: ["in"], outputs: ["item", "done"] } },
  { type: "logic.stop", version: 1, category: "logic", label: "Encerrar", description: "Termina a execução com sucesso.", icon: "circle-stop", executable: true, handles: { inputs: ["in"], outputs: [] } },
  { type: "logic.stopError", version: 1, category: "advanced", label: "Encerrar com erro", description: "Termina a execução como falha explícita.", icon: "octagon-x", executable: true, handles: { inputs: ["in"], outputs: [] } },
  { type: "logic.delay", version: 1, category: "time", label: "Esperar", description: "Pausa a automação por um período ou até uma data.", icon: "clock-3", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "logic.waitForEvent", version: 1, category: "time", label: "Esperar por evento", description: "Aguarda um evento do CRM ou o tempo limite.", icon: "hourglass", executable: true, handles: { inputs: ["in"], outputs: ["received", "timeout"] } },
  { type: "data.findContact", version: 1, category: "data", label: "Buscar contato", description: "Localiza um contato por telefone, e-mail ou ID.", icon: "search", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "data.findDeal", version: 1, category: "data", label: "Buscar lead", description: "Localiza um negócio no CRM.", icon: "search", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "data.findOrder", version: 1, category: "data", label: "Buscar pedido", description: "Localiza pedidos do cliente.", icon: "search", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "data.findDuplicates", version: 1, category: "data", label: "Encontrar duplicados", description: "Compara telefone, e-mail ou documento e ignora pós-venda.", icon: "copy", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "data.setVariable", version: 1, category: "data", label: "Definir variável", description: "Guarda um valor para usar nos próximos passos.", icon: "variable", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.deal.moveStage", version: 1, category: "crm", label: "Mover lead", description: "Move o negócio para uma etapa real do pipeline.", icon: "move-right", executable: true, requiredConfig: ["stageId"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.deal.assignOwner", version: 1, category: "crm", label: "Alterar responsável", description: "Define o dono do lead.", icon: "user-round-cog", executable: true, handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.deal.addTag", version: 1, category: "crm", label: "Adicionar tag", description: "Adiciona uma tag sem duplicar.", icon: "tag", executable: true, requiredConfig: ["tagId"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.deal.removeTag", version: 1, category: "crm", label: "Remover tag", description: "Remove uma tag do lead.", icon: "tag", executable: true, requiredConfig: ["tagId"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.task.create", version: 1, category: "crm", label: "Criar tarefa", description: "Cria uma tarefa no CRM.", icon: "list-checks", executable: true, requiredConfig: ["title"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.note.create", version: 1, category: "crm", label: "Adicionar nota", description: "Registra uma nota no histórico.", icon: "sticky-note", executable: true, requiredConfig: ["body"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.order.updateStatus", version: 1, category: "crm", label: "Alterar status do pedido", description: "Atualiza o status operacional do pedido.", icon: "package-check", executable: true, requiredConfig: ["status"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.whatsapp.send", version: 1, category: "communication", label: "Enviar WhatsApp", description: "Envia mensagem pelo canal da conexão.", icon: "message-circle", executable: true, requiredConfig: ["body"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.notify.user", version: 1, category: "communication", label: "Notificar usuário", description: "Cria uma notificação no CRM.", icon: "bell", executable: true, requiredConfig: ["title"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "action.http.request", version: 1, category: "advanced", label: "HTTP Request", description: "Chama um endpoint externo com proteção SSRF.", icon: "globe", executable: true, requiredConfig: ["url", "method"], handles: { inputs: ["in"], outputs: ["out"] } },
  { type: "visual.frame", version: 1, category: "visual", label: "Grupo", description: "Organiza o canvas. Não executa lógica.", icon: "square", executable: false, handles: { inputs: [], outputs: [] } },
  { type: "visual.note", version: 1, category: "visual", label: "Nota", description: "Anotação no canvas. Não executa lógica.", icon: "sticky-note", executable: false, handles: { inputs: [], outputs: [] } },
];

export function nodeTypeId(type: string, version = 1) {
  return `${type}@${version}`;
}

export function parseNodeType(value: string) {
  const [type, versionRaw] = value.split("@");
  return { type, version: Number(versionRaw ?? 1) || 1 };
}

export function getCatalogEntry(type: string) {
  const parsed = parseNodeType(type);
  return NODE_CATALOG.find((entry) => entry.type === parsed.type && entry.version === parsed.version)
    ?? NODE_CATALOG.find((entry) => entry.type === parsed.type);
}

export function catalogForApi() {
  return NODE_CATALOG.map((entry) => ({
    ...entry,
    id: nodeTypeId(entry.type, entry.version),
  }));
}
