import { describe, expect, it } from "vitest";
import {
  connectionAccessLabel,
  connectionAccountLine,
  connectionBadgeLabel,
  connectionCanDisconnect,
  connectionCanReconnect,
  connectionChannelVisual,
  connectionDestinationLabel,
  connectionDestinationParts,
  connectionPipelinesLabel,
  connectionPipelinesSummary,
  formatConnectionScalar,
  isManualConnection,
} from "./connections-format";
import { connectionsText } from "./connections-i18n";

const copy = connectionsText("pt-BR");

describe("connection menu rules", () => {
  it("shows disconnect for connected and mid-pairing statuses only", () => {
    expect(connectionCanDisconnect("CONNECTED")).toBe(true);
    expect(connectionCanDisconnect("QR_PENDING")).toBe(true);
    expect(connectionCanDisconnect("CONNECTING")).toBe(true);
    expect(connectionCanDisconnect("RECONNECTING")).toBe(true);
    expect(connectionCanDisconnect("DISCONNECTED")).toBe(false);
    expect(connectionCanDisconnect("ERROR")).toBe(false);
    expect(connectionCanDisconnect("DRAFT")).toBe(false);
  });

  it("shows reconnect for offline/error and never for connected", () => {
    expect(connectionCanReconnect("DISCONNECTED")).toBe(true);
    expect(connectionCanReconnect("ERROR")).toBe(true);
    expect(connectionCanReconnect("DRAFT")).toBe(true);
    expect(connectionCanReconnect("CONNECTED")).toBe(false);
    expect(connectionCanReconnect("QR_PENDING")).toBe(false);
    expect(connectionCanReconnect("CONNECTING")).toBe(false);
  });
});

describe("connections copy labels", () => {
  it("exposes delete connection and never archive/open in the product copy", () => {
    expect(copy.deleteConnection).toBe("Excluir conexão");
    expect(copy.deleteTitle).toContain("Excluir");
    expect(copy).not.toHaveProperty("archive");
    expect(copy).not.toHaveProperty("open");
  });
});

describe("formatConnectionScalar", () => {
  it("never renders [object Object] for nested values", () => {
    expect(formatConnectionScalar({ id: "1", name: "Comercial" })).toBe("Comercial");
    expect(formatConnectionScalar([{ name: "A" }, { name: "B" }])).toBe("A, B");
    expect(formatConnectionScalar({ foo: "bar" })).toBe("—");
    expect(formatConnectionScalar(null)).toBe("—");
    expect(String(formatConnectionScalar({ nested: true }))).not.toContain("[object Object]");
    expect(String(formatConnectionScalar(undefined))).not.toMatch(/undefined|null/i);
  });
});

describe("connection card presentation", () => {
  it("shows connected status for a linked WhatsApp account", () => {
    const connection = {
      status: "CONNECTED",
      type: "WHATSAPP",
      displayAccount: "+55 32 99999-9999",
      phone: null,
    };
    expect(connectionBadgeLabel(connection, copy)).toBe("Conectado");
    expect(connectionAccountLine(connection, copy)).toBe("+55 32 99999-9999");
    expect(connectionAccountLine(connection, copy)).not.toContain("não vinculada");
  });

  it("does not contradict CONNECTED with account-not-linked", () => {
    const connection = {
      status: "CONNECTED",
      type: "WHATSAPP",
      displayAccount: null,
      phone: null,
    };
    expect(connectionBadgeLabel(connection, copy)).toBe("Conectado");
    expect(connectionAccountLine(connection, copy)).toBe("Conta vinculada");
    expect(connectionAccountLine(connection, copy)).not.toBe("Conta não vinculada");
    expect(connectionAccountLine(connection, copy)).not.toContain("ainda não");
  });

  it("shows account-not-linked only when the integration is not connected", () => {
    expect(
      connectionAccountLine(
        { status: "DISCONNECTED", type: "WHATSAPP", displayAccount: null, phone: null },
        copy,
      ),
    ).toBe("Conta não vinculada");
  });

  it("treats MANUAL as active entry rather than an external session", () => {
    const connection = {
      status: "CONNECTED",
      type: "MANUAL",
      displayAccount: null,
      phone: null,
    };
    expect(isManualConnection(connection)).toBe(true);
    expect(connectionBadgeLabel(connection, copy)).toBe("Ativo");
    expect(connectionBadgeLabel(connection, copy)).not.toBe("Conectado");
    expect(connectionAccountLine(connection, copy)).toBe("Entrada manual");
  });

  it("formats empty destination and pipeline counts naturally", () => {
    expect(connectionDestinationLabel({ defaultPipeline: null }, copy)).toBe("Não configurado");
    expect(
      connectionDestinationLabel(
        {
          defaultPipeline: { id: "p1", name: "Comercial" },
          defaultStage: { id: "s1", name: "Novos Leads" },
        },
        copy,
      ),
    ).toBe("Comercial");
    expect(connectionDestinationParts({ defaultPipeline: null })).toEqual({
      pipelineName: null,
      stageName: null,
    });
    expect(
      connectionDestinationParts({
        defaultPipeline: { id: "p1", name: "Comercial Principal" },
        defaultStage: { id: "s1", name: "Qualificação" },
      }),
    ).toEqual({ pipelineName: "Comercial Principal", stageName: "Qualificação" });
    expect(connectionPipelinesLabel(0, copy)).toBe("Nenhum pipeline");
    expect(connectionPipelinesLabel(1, copy)).toBe("1 pipeline");
    expect(connectionPipelinesLabel(2, copy)).toBe("2 pipelines");
    expect(
      connectionPipelinesSummary(
        { enabledPipelineCount: 0, defaultPipeline: null },
        copy,
      ),
    ).toEqual({ mode: "empty" });
    expect(
      connectionPipelinesSummary(
        { enabledPipelineCount: 1, defaultPipeline: { id: "p1", name: "Comercial" } },
        copy,
      ),
    ).toEqual({ mode: "single", name: "Comercial" });
    expect(
      connectionPipelinesSummary(
        { enabledPipelineCount: 3, defaultPipeline: { id: "p1", name: "Comercial" } },
        copy,
      ),
    ).toEqual({ mode: "multi", name: "Comercial", extra: 2 });
  });

  it("formats organization access as a friendly phrase", () => {
    expect(connectionAccessLabel("Organização", copy)).toBe("Toda a organização");
    expect(connectionAccessLabel("Organization", copy)).toBe("Toda a organização");
    expect(connectionAccessLabel("3 usuário(s)", copy)).toBe("3 usuários");
    expect(connectionAccessLabel("Equipe Comercial", copy)).toBe("Equipe Comercial");
  });

  it("picks channel icons by type without inventing unknown providers", () => {
    expect(connectionChannelVisual({ type: "WHATSAPP" }).kind).toBe("whatsapp");
    expect(connectionChannelVisual({ type: "WHATSAPP" }).containerClass).toContain("emerald");
    expect(connectionChannelVisual({ type: "EMAIL" }).containerClass).toContain("sky");
    expect(connectionChannelVisual({ type: "MANUAL" }).containerClass).toContain("slate");
    expect(connectionChannelVisual({ type: "INSTAGRAM" }).containerClass).toContain("fuchsia");
  });
});
