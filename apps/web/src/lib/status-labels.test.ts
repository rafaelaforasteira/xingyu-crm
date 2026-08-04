import { describe, expect, it } from "vitest";
import {
  conversationStatusLabel,
  occurrenceStatusLabel,
  orderStatusLabel,
  priorityLabel,
  taskStatusLabel,
} from "./status-labels";

describe("status-labels", () => {
  it("translates task statuses without exposing enums", () => {
    expect(taskStatusLabel("PENDING")).toBe("Pendente");
    expect(taskStatusLabel("IN_PROGRESS")).toBe("Em andamento");
    expect(taskStatusLabel("COMPLETED", true)).toBe("Atrasada");
    expect(taskStatusLabel("UNKNOWN_CODE")).toBe("Status desconhecido");
  });

  it("translates occurrence and order statuses", () => {
    expect(occurrenceStatusLabel("UNDER_REVIEW")).toBe("Em análise");
    expect(occurrenceStatusLabel("AWAITING_CUSTOMER")).toBe("Aguardando cliente");
    expect(orderStatusLabel("AWAITING_PAYMENT")).toBe("Aguardando pagamento");
    expect(orderStatusLabel("WEIRD")).toBe("Status desconhecido");
  });

  it("translates priorities and conversation statuses", () => {
    expect(priorityLabel("HIGH")).toBe("Alta");
    expect(conversationStatusLabel("OPEN")).toBe("Aberta");
  });
});
