import type { WorkflowDefinition } from "../domain/definition";

function node(id: string, type: string, x: number, y: number, config: Record<string, unknown> = {}, label?: string) {
  return { id, type, position: { x, y }, config, label };
}

function edge(id: string, source: string, target: string, sourceHandle = "out") {
  return { id, source, target, sourceHandle };
}

export interface SystemTemplate {
  key: string;
  name: string;
  description: string;
  category: "Comercial" | "Pedidos" | "Pós-venda" | "Atendimento" | "Reativação" | "Operacional";
  definition: WorkflowDefinition;
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    key: "triage",
    name: "Triagem de novo lead",
    description: "Quando um lead chega, identifica o canal e segue para o comercial.",
    category: "Comercial",
    definition: {
      schemaVersion: 1,
      frames: [{ id: "f1", label: "PHASE 1 — TRIAGEM", x: 24, y: 16, width: 360, height: 520, color: "violet" }],
      nodes: [
        node("t1", "trigger.deal.created@1", 80, 80, {}, "Novo lead"),
        node("c1", "data.findDuplicates@1", 80, 220, { ignoreAfterSales: true }, "Verificar duplicidade"),
        node("i1", "logic.if@1", 80, 360, { items: [{ field: "nodes.c1.output.found", operator: "EQUALS", value: true }] }, "Já existe?"),
        node("a1", "action.deal.addTag@1", 280, 480, {}, "Marcar duplicado"),
        node("a2", "action.deal.moveStage@1", 80, 520, {}, "Mover para Comercial"),
      ],
      edges: [
        edge("e1", "t1", "c1"),
        edge("e2", "c1", "i1"),
        edge("e3", "i1", "a1", "true"),
        edge("e4", "i1", "a2", "false"),
      ],
    },
  },
  {
    key: "duplicates",
    name: "Lead duplicado",
    description: "Encontra leads existentes fora do pós-venda e notifica se pertencer a outra vendedora.",
    category: "Comercial",
    definition: {
      schemaVersion: 1,
      nodes: [
        node("t1", "trigger.deal.created@1", 80, 80, {}, "Novo lead"),
        node("c1", "data.findDuplicates@1", 80, 220, { matchBy: ["phone", "email"], ignoreAfterSales: true }, "Encontrar duplicados"),
        node("i1", "logic.if@1", 80, 360, { items: [{ field: "nodes.c1.output.found", operator: "EQUALS", value: true }] }, "Existe?"),
        node("a1", "action.deal.addTag@1", 280, 500, {}, "Adicionar tag Lead duplicado"),
        node("n1", "action.notify.user@1", 280, 640, { title: "Lead duplicado identificado", body: "Um lead chegou em um funil que já pertence a outra pessoa." }, "Notificar"),
        node("s1", "logic.stop@1", 80, 500, {}, "Encerrar"),
      ],
      edges: [
        edge("e1", "t1", "c1"),
        edge("e2", "c1", "i1"),
        edge("e3", "i1", "a1", "true"),
        edge("e4", "a1", "n1"),
        edge("e5", "i1", "s1", "false"),
      ],
    },
  },
  {
    key: "abandoned-cart",
    name: "Recuperação de carrinho",
    description: "Espera o pagamento, evita duplicidade e segue só se o pedido continuar em aberto.",
    category: "Pedidos",
    definition: {
      schemaVersion: 1,
      nodes: [
        node("t1", "trigger.order.created@1", 80, 80, {}, "Pedido criado"),
        node("w1", "logic.waitForEvent@1", 80, 220, { eventType: "order.payment.confirmed", timeoutMinutes: 30 }, "Esperar pagamento"),
        node("s1", "logic.stop@1", 280, 360, {}, "Encerrar"),
        node("f1", "data.findOrder@1", 80, 360, {}, "Buscar pedidos do cliente"),
        node("i1", "logic.if@1", 80, 500, { items: [{ field: "current.order.status", operator: "EQUALS", value: "PAYMENT_APPROVED" }] }, "Pagamento confirmado?"),
        node("n1", "action.notify.user@1", 80, 640, { title: "Carrinho abandonado", body: "Pedido {{order.number}} ainda aguarda pagamento." }, "Ação de recuperação"),
      ],
      edges: [
        edge("e1", "t1", "w1"),
        edge("e2", "w1", "s1", "received"),
        edge("e3", "w1", "f1", "timeout"),
        edge("e4", "f1", "i1"),
        edge("e5", "i1", "s1", "true"),
        edge("e6", "i1", "n1", "false"),
      ],
    },
  },
  {
    key: "payment-confirmed",
    name: "Pagamento confirmado",
    description: "Move para pós-venda, cria tarefa e notifica a operação.",
    category: "Pós-venda",
    definition: {
      schemaVersion: 1,
      nodes: [
        node("t1", "trigger.order.paymentConfirmed@1", 80, 80, {}, "Pagamento confirmado"),
        node("m1", "action.deal.moveStage@1", 80, 220, {}, "Mover para Pós-venda"),
        node("k1", "action.task.create@1", 80, 360, { title: "Conferir endereço e separar pedido {{order.number}}" }, "Criar tarefa"),
        node("n1", "action.notify.user@1", 80, 500, { title: "Pagamento confirmado", body: "Pedido {{order.number}} pronto para operação." }, "Notificar"),
        node("o1", "action.order.updateStatus@1", 80, 640, { status: "SEPARATING" }, "Atualizar pedido"),
      ],
      edges: [
        edge("e1", "t1", "m1"),
        edge("e2", "m1", "k1"),
        edge("e3", "k1", "n1"),
        edge("e4", "n1", "o1"),
      ],
    },
  },
  {
    key: "follow-up",
    name: "Follow-up de negociação",
    description: "Espera resposta do cliente e segue para follow-up se ninguém responder.",
    category: "Atendimento",
    definition: {
      schemaVersion: 1,
      nodes: [
        node("t1", "trigger.deal.stageChanged@1", 80, 80, {}, "Lead em negociação"),
        node("w1", "logic.waitForEvent@1", 80, 220, { eventType: "message.received", timeoutMinutes: 1440 }, "Cliente respondeu?"),
        node("s1", "logic.stop@1", 280, 360, {}, "Encerrar"),
        node("n1", "action.whatsapp.send@1", 80, 360, { body: "Olá {{contact.firstName}}, ainda posso ajudar com sua proposta?" }, "Enviar follow-up"),
      ],
      edges: [
        edge("e1", "t1", "w1"),
        edge("e2", "w1", "s1", "received"),
        edge("e3", "w1", "n1", "timeout"),
      ],
    },
  },
  {
    key: "task-overdue",
    name: "Tarefa atrasada",
    description: "Notifica o responsável quando uma tarefa deixa de ser concluída no prazo.",
    category: "Operacional",
    definition: {
      schemaVersion: 1,
      nodes: [
        node("t1", "trigger.task.completed@1", 80, 80, {}, "Tarefa concluída"),
        node("f1", "logic.filter@1", 80, 80, { items: [] }, "Usar como base para atraso"),
        node("n1", "action.notify.user@1", 80, 220, { title: "Tarefa atrasada", body: "Há uma tarefa em atraso no CRM." }, "Notificar responsável"),
      ],
      edges: [edge("e1", "t1", "n1")],
    },
  },
];
