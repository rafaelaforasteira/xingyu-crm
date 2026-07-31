import { describe, expect, it, vi } from "vitest";
import { normalizeReactivationResponse } from "./reactivation-utils";

const validItem = {
  id: "reactivation-1",
  contact: {
    id: "contact-1",
    name: "Marina Souza",
    firstName: "Marina",
    lastName: "Souza",
    email: "marina@example.com",
    phone: "+5511999999999",
    whatsapp: null,
    instagram: "@marina",
    totalPurchased: "1250.50",
    averageTicket: "625.25",
    orderCount: 2,
  },
  score: 86,
  reason: "Sem interação recente",
  status: "INACTIVE",
  classification: "recorrente_parou",
  daysInactive: 194,
  lastInteractionAt: "2026-01-10T12:00:00.000Z",
  lastPurchaseAt: "2025-12-20T12:00:00.000Z",
  owner: { id: "user-1", name: "Ana" },
  team: { id: "team-1", name: "Comercial" },
  existingOpenDealId: null,
};

describe("normalizeReactivationResponse", () => {
  it("normalizes the paginated contract and finite decimals", () => {
    const response = normalizeReactivationResponse({
      data: [validItem],
      meta: {
        total: 31,
        page: 2,
        pageSize: 20,
        totalPages: 2,
      },
    });

    expect(response.meta).toEqual({
      total: 31,
      page: 2,
      pageSize: 20,
      totalPages: 2,
    });
    expect(response.data[0]).toMatchObject({
      id: "reactivation-1",
      score: 86,
      daysInactive: 194,
      contact: {
        id: "contact-1",
        totalPurchased: 1250.5,
        averageTicket: 625.25,
        orderCount: 2,
      },
    });
  });

  it("preserves a valid row when contact is null", () => {
    const response = normalizeReactivationResponse({
      data: [{ ...validItem, contact: null }],
      meta: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.contact).toBeNull();
  });

  it("normalizes null data to an empty page while preserving meta", () => {
    const response = normalizeReactivationResponse(
      {
        data: null,
        meta: {
          total: 0,
          page: 3,
          pageSize: 20,
          totalPages: 0,
        },
      },
      { page: 3, pageSize: 20 },
    );

    expect(response.data).toEqual([]);
    expect(response.meta).toEqual({
      total: 0,
      page: 3,
      pageSize: 20,
      totalPages: 0,
    });
  });

  it("drops malformed rows and degrades invalid relations and dates safely", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = normalizeReactivationResponse({
      items: [
        {
          ...validItem,
          id: "safe-row",
          contact: { id: "missing-required-contact-fields" },
          owner: "invalid",
          team: [],
          lastInteractionAt: "not-a-date",
        },
        { ...validItem, id: "bad-score", score: "invalid" },
        null,
      ],
      meta: {
        total: 3,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });

    expect(response.data).toHaveLength(1);
    expect(response.data[0]).toMatchObject({
      id: "safe-row",
      contact: null,
      owner: null,
      team: null,
      lastInteractionAt: null,
    });
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("degraded an invalid contact relation"),
    );
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("discarded an item with invalid required fields"),
    );
    expect(error).not.toHaveBeenCalled();
    warning.mockRestore();
    error.mockRestore();
    vi.unstubAllEnvs();
  });
});
