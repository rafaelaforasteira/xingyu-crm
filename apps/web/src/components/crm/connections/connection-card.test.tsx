import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConnectionCard } from "@/components/crm/connections/connection-card";
import { connectionsText } from "@/lib/connections-i18n";
import type { ConnectionListItem } from "@/lib/types";

const copy = connectionsText("pt-BR");

function renderCard(connection: ConnectionListItem, onOpen = vi.fn(), onAction = vi.fn()) {
  return {
    onOpen,
    onAction,
    html: renderToStaticMarkup(
      createElement(ConnectionCard, {
        connection,
        copy,
        locale: "pt-BR",
        onOpen,
        onAction,
      }),
    ),
  };
}

describe("ConnectionCard markup", () => {
  it("renders a connected WhatsApp card with brand icon and separated destination", () => {
    const { html } = renderCard({
      id: "wa-1",
      name: "WhatsApp Comercial",
      provider: "evolution",
      type: "WHATSAPP",
      status: "CONNECTED",
      displayAccount: "+55 32 99999-9999",
      defaultPipeline: { id: "p1", name: "Comercial Principal" },
      defaultStage: { id: "s1", name: "Qualificação" },
      enabledPipelineCount: 2,
      accessSummary: "Organização",
      lastActivityAt: new Date().toISOString(),
    });

    expect(html).toContain('data-channel-kind="whatsapp"');
    expect(html).toContain('data-testid="whatsapp-icon"');
    expect(html).toContain("WhatsApp Comercial");
    expect(html).toContain("Conectado");
    expect(html).toContain("+55 32 99999-9999");
    expect(html).toContain("Comercial Principal");
    expect(html).toContain("Qualificação");
    expect(html).not.toContain("Comercial Principal → Qualificação");
    expect(html).not.toContain("→");
    expect(html).toContain("+1");
    expect(html).not.toContain("+0");
    expect(html).toContain("Toda a organização");
    expect(html).toContain('data-testid="connection-meta-destination"');
    expect(html).toContain('data-testid="connection-meta-pipelines"');
    expect(html).toContain('data-testid="connection-meta-access"');
    expect(html).toContain('data-testid="connection-meta-activity"');
    expect(html).toContain("data-meta-icon");
    expect(html).not.toContain("Conta não vinculada");
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain(">null<");
  });

  it("renders empty operational states with friendly copy", () => {
    const { html } = renderCard({
      id: "wa-2",
      name: "Email Comercial",
      provider: null,
      type: "EMAIL",
      status: "DRAFT",
      displayAccount: null,
      defaultPipeline: null,
      enabledPipelineCount: 0,
      accessSummary: null,
      lastActivityAt: null,
    });

    expect(html).toContain("Não configurado");
    expect(html).toContain("Nenhum pipeline");
    expect(html).toContain("Nunca");
    expect(html).toContain("Conta não vinculada");
    expect(html).not.toContain("+0");
    expect(html).not.toContain("[object Object]");
  });

  it("renders a single pipeline chip without +N", () => {
    const { html } = renderCard({
      id: "wa-3",
      name: "WhatsApp Loja",
      provider: "evolution",
      type: "WHATSAPP",
      status: "CONNECTED",
      displayAccount: "+55 11 90000-0000",
      defaultPipeline: { id: "p1", name: "Comercial" },
      enabledPipelineCount: 1,
      accessSummary: "Organização",
    });

    expect(html).toContain("Comercial");
    expect(html).not.toContain("+1");
    expect(html).not.toContain("+0");
  });

  it("renders +2 for three enabled pipelines", () => {
    const { html } = renderCard({
      id: "wa-4",
      name: "WhatsApp Multi",
      provider: "evolution",
      type: "WHATSAPP",
      status: "CONNECTED",
      displayAccount: "+55 11 91111-1111",
      defaultPipeline: { id: "p1", name: "Comercial Principal" },
      enabledPipelineCount: 3,
      accessSummary: "Organização",
    });

    expect(html).toContain("Comercial Principal");
    expect(html).toContain("+2");
    expect(html).not.toContain("+0");
  });

  it("renders MANUAL channels as active manual entry", () => {
    const { html } = renderCard({
      id: "manual-1",
      name: "Manual / Indicação",
      provider: null,
      type: "MANUAL",
      status: "CONNECTED",
      displayAccount: null,
      enabledPipelineCount: 1,
      accessSummary: "Organização",
    });

    expect(html).toContain('data-channel-kind="manual"');
    expect(html).toContain("Ativo");
    expect(html).toContain("Entrada manual");
    expect(html).not.toContain("Conectado");
    expect(html).not.toContain("Conta não vinculada");
    expect(html).not.toContain('data-testid="whatsapp-icon"');
  });

  it("keeps the action menu wrapper isolated from card open clicks", () => {
    const { html } = renderCard({
      id: "wa-5",
      name: "WhatsApp Menu",
      provider: "evolution",
      type: "WHATSAPP",
      status: "CONNECTED",
      displayAccount: "+55 11 92222-2222",
      enabledPipelineCount: 1,
      accessSummary: "Organização",
    });

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("role=\"button\"");
    expect(html).toContain('data-testid="connection-card"');
  });
});
