import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAttachmentEligibleForLeadFiles } from "./message-actions-menu";

const attachment = (kind: string) => ({
  id: `attachment-${kind}`,
  fileName: "arquivo",
  url: "/api/uploads/files/arquivo",
  kind,
});

describe("curated lead files", () => {
  it.each(["image", "video", "audio", "voice", "document"])("allows %s attachments", (kind) =>
    expect(isAttachmentEligibleForLeadFiles(attachment(kind))).toBe(true),
  );

  it.each(["sticker", "text", "unsupported"])("excludes %s attachments", (kind) =>
    expect(isAttachmentEligibleForLeadFiles(attachment(kind))).toBe(false),
  );

  it("keeps files compact, previewable and removable", () => {
    const section = readFileSync(new URL("./lead-files.tsx", import.meta.url), "utf8");
    const menu = readFileSync(new URL("./message-actions-menu.tsx", import.meta.url), "utf8");
    expect(section).toContain("files.slice(0, 3)");
    expect(section).toContain("Ver todos os arquivos");
    expect(section).toContain("lead-file-preview");
    expect(section).toContain("Remover dos Arquivos");
    expect(menu).toContain("Guardar em Arquivos");
    expect(menu).toContain("Salvo em Arquivos");
  });
});
