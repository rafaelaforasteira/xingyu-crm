import { fullName, companyDisplayName } from "./names";
import { toNumber } from "./decimal";
import { flattenTags } from "./tags";
import { toContactResponse } from "./contact.mapper";
import { toCompanyResponse } from "./company.mapper";
import { toDealResponse } from "./deal.mapper";
import { toPipelineStageResponse } from "./pipeline.mapper";

describe("names", () => {
  it("builds fullName from first and last", () => {
    expect(fullName("Ana", "Silva")).toBe("Ana Silva");
    expect(fullName("Ana", null)).toBe("Ana");
    expect(fullName("Ana", "")).toBe("Ana");
  });

  it("prefers tradeName for company display", () => {
    expect(companyDisplayName("Razao LTDA", "Marca")).toBe("Marca");
    expect(companyDisplayName("Razao LTDA", null)).toBe("Razao LTDA");
  });
});

describe("toNumber", () => {
  it("coerces decimal-like values", () => {
    expect(toNumber(12.5)).toBe(12.5);
    expect(toNumber("10.25")).toBe(10.25);
    expect(toNumber({ toNumber: () => 7 })).toBe(7);
    expect(toNumber(null)).toBe(0);
    expect(toNumber("x")).toBe(0);
  });
});

describe("flattenTags", () => {
  it("flattens junction tags", () => {
    expect(
      flattenTags([
        { tag: { id: "1", name: "VIP", color: "#f00" } },
        { tag: null },
        {},
      ]),
    ).toEqual([{ id: "1", name: "VIP", color: "#f00" }]);
  });
});

describe("toContactResponse", () => {
  it("adds name and flattens tags", () => {
    const result = toContactResponse({
      id: "c1",
      firstName: "João",
      lastName: "Souza",
      email: "a@b.com",
      totalPurchased: "150.00",
      tags: [{ tag: { id: "t1", name: "Lead", color: null } }],
      company: {
        id: "co1",
        legalName: "Empresa SA",
        tradeName: "Empresa",
      },
    });
    expect(result.name).toBe("João Souza");
    expect(result.tags).toEqual([{ id: "t1", name: "Lead", color: null }]);
    expect(result.company?.name).toBe("Empresa");
    expect(result.totalPurchased).toBe(150);
  });
});

describe("toCompanyResponse", () => {
  it("maps name and count aliases", () => {
    const result = toCompanyResponse({
      id: "co1",
      legalName: "Legal",
      tradeName: null,
      cnpj: "123",
      _count: { contacts: 3, deals: 2 },
    });
    expect(result.name).toBe("Legal");
    expect(result.document).toBe("123");
    expect(result.contactsCount).toBe(3);
    expect(result.dealsCount).toBe(2);
  });
});

describe("toDealResponse", () => {
  it("maps unreadMessages to unreadCount", () => {
    const result = toDealResponse({
      id: "d1",
      name: "Deal",
      value: "99.9",
      unreadMessages: 4,
      pipelineId: "p1",
      stageId: "s1",
      contact: { id: "c1", firstName: "A", lastName: "B" },
      tags: [{ tag: { id: "t1", name: "X", color: "#000" } }],
      stage: {
        id: "s1",
        pipelineId: "p1",
        name: "Novo",
        position: 2,
        order: 9,
      },
    });
    expect(result.unreadCount).toBe(4);
    expect(result.value).toBe(99.9);
    expect(result.contact?.name).toBe("A B");
    expect(result.stage?.position).toBe(2);
    expect(result.tags[0]?.name).toBe("X");
  });
});

describe("toPipelineStageResponse", () => {
  it("uses position and ignores order when position present", () => {
    expect(
      toPipelineStageResponse({
        id: "s1",
        pipelineId: "p1",
        name: "Stage",
        position: 3,
        order: 99,
      }).position,
    ).toBe(3);
  });
});
