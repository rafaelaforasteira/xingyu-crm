import {
  classifyWaitingKind,
  formatWaitingDuration,
  isConversationAwaitingReply,
  waitingKindLabel,
  waitingMinutesSince,
} from "./waiting-conversations";

describe("isConversationAwaitingReply", () => {
  it("marks open conversations whose last message is from the client", () => {
    expect(
      isConversationAwaitingReply({ status: "OPEN", lastMessageDirection: "INBOUND" }),
    ).toBe(true);
  });

  it("does not mark conversations already answered by the team", () => {
    expect(
      isConversationAwaitingReply({ status: "OPEN", lastMessageDirection: "OUTBOUND" }),
    ).toBe(false);
  });

  it("still awaits reply when the conversation is read (unread is irrelevant)", () => {
    expect(
      isConversationAwaitingReply({ status: "OPEN", lastMessageDirection: "INBOUND" }),
    ).toBe(true);
  });

  it("ignores closed conversations", () => {
    expect(
      isConversationAwaitingReply({ status: "CLOSED", lastMessageDirection: "INBOUND" }),
    ).toBe(false);
  });
});

describe("waiting helpers", () => {
  it("classifies first response vs follow-up", () => {
    expect(classifyWaitingKind(false)).toBe("first_response");
    expect(classifyWaitingKind(true)).toBe("follow_up");
    expect(waitingKindLabel("first_response")).toBe("Aguardando primeira resposta");
  });

  it("formats waiting duration", () => {
    const now = new Date("2026-07-31T12:00:00.000Z");
    expect(waitingMinutesSince(new Date("2026-07-31T11:40:00.000Z"), now)).toBe(20);
    expect(formatWaitingDuration(20)).toBe("20min");
    expect(formatWaitingDuration(138)).toBe("2h18min");
  });
});
