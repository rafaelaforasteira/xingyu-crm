export function taskStatusLabel(status?: string | null, overdue = false): string {
  if (overdue) return "Atrasada";
  switch ((status ?? "").toUpperCase()) {
    case "PENDING":
    case "OPEN":
      return "Pendente";
    case "IN_PROGRESS":
      return "Em andamento";
    case "DONE":
    case "COMPLETED":
      return "Concluída";
    case "CANCELLED":
    case "CANCELED":
      return "Cancelada";
    default:
      return "Status desconhecido";
  }
}

export function occurrenceStatusLabel(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "OPEN":
      return "Aberta";
    case "UNDER_REVIEW":
      return "Em análise";
    case "AWAITING_CUSTOMER":
      return "Aguardando cliente";
    case "RESOLVED":
      return "Resolvida";
    case "CLOSED":
      return "Encerrada";
    default:
      return "Status desconhecido";
  }
}

export function priorityLabel(priority?: string | null): string {
  switch ((priority ?? "").toUpperCase()) {
    case "URGENT":
      return "Urgente";
    case "HIGH":
      return "Alta";
    case "MEDIUM":
      return "Média";
    case "LOW":
      return "Baixa";
    default:
      return "Prioridade padrão";
  }
}

export function orderStatusLabel(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "ORDER_PLACED":
      return "Pedido realizado";
    case "AWAITING_PAYMENT":
      return "Aguardando pagamento";
    case "PAYMENT_APPROVED":
      return "Pagamento aprovado";
    case "SEPARATING":
      return "Em separação";
    case "IN_PRODUCTION":
      return "Em produção";
    case "LEFT_FACTORY":
      return "Saiu da fábrica";
    case "INTERNATIONAL_TRANSPORT":
      return "Transporte internacional";
    case "ARRIVED_BRAZIL":
      return "Chegou ao Brasil";
    case "NATIONAL_TRANSPORT":
      return "Transporte nacional";
    case "DELIVERED":
      return "Entregue";
    case "COMPLETED":
      return "Concluído";
    case "CANCELLED":
    case "CANCELED":
      return "Cancelado";
    case "AFTER_SALES_STARTED":
      return "Pós-venda iniciado";
    default:
      return "Status desconhecido";
  }
}

export function conversationStatusLabel(status?: string | null): string {
  switch ((status ?? "").toUpperCase()) {
    case "OPEN":
      return "Aberta";
    case "PENDING":
      return "Pendente";
    case "CLOSED":
      return "Encerrada";
    case "ARCHIVED":
      return "Arquivada";
    default:
      return "Status desconhecido";
  }
}

export function formatDelta(value: number | null | undefined, unit = "%"): string | null {
  if (value == null || Number.isNaN(value)) return null;
  const sign = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  return `${sign} ${Math.abs(value)}${unit}`;
}
