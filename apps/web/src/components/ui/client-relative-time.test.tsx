import * as React from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ClientRelativeTime,
  formatAbsoluteDateTime,
  formatRelativeDateTime,
} from "./client-relative-time";

const DATE = "2026-07-30T12:00:00.000Z";

describe("ClientRelativeTime SSR", () => {
  it("renders the same deterministic fallback on repeated server renders", () => {
    const element = (
      <ClientRelativeTime value={DATE} fallback="Data registrada" />
    );
    const firstRender = renderToString(element);
    const secondRender = renderToString(element);

    expect(firstRender).toBe(secondRender);
    expect(firstRender).toContain("Data registrada");
    expect(firstRender).toContain('dateTime="2026-07-30T12:00:00.000Z"');
    expect(firstRender).not.toContain("há ");
    expect(firstRender).not.toContain("suppressHydrationWarning");
  });

  it("uses an absolute pt-BR tooltip in the fixed CRM timezone", () => {
    const html = renderToStaticMarkup(
      <ClientRelativeTime value={DATE} fallback="Data registrada" />,
    );

    expect(formatAbsoluteDateTime(DATE)).toMatch(/30.*jul.*2026.*09:00/i);
    expect(html).toMatch(/title="[^"]*30[^"]*jul[^"]*2026[^"]*09:00[^"]*"/i);
    expect(html).toMatch(
      /aria-label="[^"]*30[^"]*jul[^"]*2026[^"]*09:00[^"]*"/i,
    );
  });

  it("is safe for null and invalid dates during SSR", () => {
    expect(
      renderToStaticMarkup(
        <ClientRelativeTime value={null} invalidFallback="Sem data" />,
      ),
    ).toBe("<span>Sem data</span>");
    expect(
      renderToStaticMarkup(
        <ClientRelativeTime
          value="data-inválida"
          invalidFallback="Data inválida"
        />,
      ),
    ).toBe("<span>Data inválida</span>");
  });

  it("formats relative text only when an explicit client reference exists", () => {
    expect(
      formatRelativeDateTime(DATE, "2026-07-31T12:00:00.000Z"),
    ).toBe("há 1 dia");
    expect(formatRelativeDateTime(null, "2026-07-31T12:00:00.000Z")).toBeNull();
    expect(formatRelativeDateTime(DATE, "data-inválida")).toBeNull();
  });
});
