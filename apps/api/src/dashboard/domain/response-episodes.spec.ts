import { responseEpisodes, responseSummary } from "./response-episodes";

describe("response episodes", () => {
  it("starts at the first inbound and closes at the next outbound", () => {
    const base = new Date("2026-08-13T10:00:00Z");
    const at = (minutes: number) => new Date(base.getTime() + minutes * 60_000);
    expect(
      responseEpisodes([
        { direction: "INBOUND", sentAt: at(0) },
        { direction: "INBOUND", sentAt: at(2) },
        { direction: "OUTBOUND", sentAt: at(10) },
        { direction: "INBOUND", sentAt: at(20) },
        { direction: "OUTBOUND", sentAt: at(24) },
      ]),
    ).toEqual([10, 4]);
  });

  it("calculates average and median without fabricating empty values", () => {
    expect(responseSummary([2, 8, 20, 30])).toEqual({
      averageMinutes: 15,
      medianMinutes: 14,
      count: 4,
    });
    expect(responseSummary([])).toEqual({ averageMinutes: null, medianMinutes: null, count: 0 });
  });
});
