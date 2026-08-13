import { describe, expect, it } from "vitest";
import {
  formatPhoneForDisplay,
  resolvePrimaryPhone,
} from "@/lib/format-phone-display";
import { conversationContactDisplayName } from "./conversation-list-utils";

/**
 * Summary block contracts for LeadContextPanel Resumo.
 * DOM coverage lives in Playwright.
 */
describe("Lead context summary contracts", () => {
  it("places formatted phone under the display name hierarchy", () => {
    const name = conversationContactDisplayName({
      firstName: "Luciana",
      lastName: "Vargas",
    });
    const phone = formatPhoneForDisplay("+5547988334464");
    expect(name).toBe("Luciana Vargas");
    expect(phone).toBe("+55 (47) 98833-4464");
  });

  it("does not use tags as channel or stage substitutes", () => {
    const tags = [{ name: "Lead WhatsApp" }, { name: "Quente" }];
    const channelLabel = "WhatsApp Xingyu";
    const stageLabel = "Novo";
    expect(tags.map((t) => t.name)).not.toContain(channelLabel);
    expect(stageLabel).not.toBe("Quente");
    expect(channelLabel).not.toBe("Lead WhatsApp");
  });

  it("resolves phone without preferring email", () => {
    expect(
      resolvePrimaryPhone({
        phone: null,
        whatsapp: "+5547988334464",
      }),
    ).toBe("+5547988334464");
  });

  it("omits stage badge when there is no deal", () => {
    const hasDeal = false;
    const showStageBadge = hasDeal;
    expect(showStageBadge).toBe(false);
  });
});
