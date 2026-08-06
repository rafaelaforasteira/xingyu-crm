import { describe, expect, it } from "vitest";
import {
  EMPTY_CONVERSATION_FILTERS,
  applyConversationFiltersToSearchParams,
  compareConversationsByPriority,
  conversationFiltersToApiQuery,
  conversationPriorityGroup,
  countActiveConversationFilterGroups,
  formatFilterBadgeCount,
  normalizeConversationFilters,
  parseConversationFiltersFromSearchParams,
  uniqueIds,
} from "./conversation-filter-utils";

describe("conversation-filter-utils", () => {
  it("parses default empty state", () => {
    const filters = parseConversationFiltersFromSearchParams(
      new URLSearchParams(),
    );
    expect(filters).toEqual(EMPTY_CONVERSATION_FILTERS);
    expect(countActiveConversationFilterGroups(filters)).toBe(0);
  });

  it("parses and serializes filter groups", () => {
    const params = new URLSearchParams(
      "view=conversations&q=maria&conversation=c1&channels=a,b,a&unread=1&reply=mine&conversationState=open&stages=s1,s2&tags=t1&period=7d",
    );
    const filters = parseConversationFiltersFromSearchParams(params);
    expect(filters.channelIds).toEqual(["a", "b"]);
    expect(filters.unreadOnly).toBe(true);
    expect(filters.reply).toBe("mine");
    expect(filters.conversationState).toBe("open");
    expect(filters.stageIds).toEqual(["s1", "s2"]);
    expect(filters.tagIds).toEqual(["t1"]);
    expect(filters.period).toBe("7d");

    const next = applyConversationFiltersToSearchParams(params, filters);
    expect(next.get("q")).toBe("maria");
    expect(next.get("view")).toBe("conversations");
    expect(next.get("conversation")).toBe("c1");
    expect(next.get("channels")).toBe("a,b");
    expect(next.get("unread")).toBe("1");
    expect(next.get("reply")).toBe("mine");
    expect(next.get("stages")).toBe("s1,s2");
    expect(next.get("tags")).toBe("t1");
    expect(next.get("period")).toBe("7d");
  });

  it("counts groups not individual options", () => {
    const count = countActiveConversationFilterGroups({
      channelIds: ["c1", "c2"],
      unreadOnly: true,
      reply: "mine",
      conversationState: "all",
      stageIds: ["s1", "s2"],
      tagIds: ["t1", "t2", "t3"],
      period: "today",
    });
    expect(count).toBe(6);
    expect(formatFilterBadgeCount(10)).toBe("9+");
    expect(formatFilterBadgeCount(0)).toBe("");
  });

  it("does not count any/all defaults", () => {
    expect(
      countActiveConversationFilterGroups({
        ...EMPTY_CONVERSATION_FILTERS,
        reply: "any",
        conversationState: "all",
        period: "any",
      }),
    ).toBe(0);
  });

  it("normalizes all channels selected as no channel filter", () => {
    const normalized = normalizeConversationFilters(
      {
        ...EMPTY_CONVERSATION_FILTERS,
        channelIds: ["a", "b"],
      },
      { availableChannelIds: ["a", "b"] },
    );
    expect(normalized.channelIds).toEqual([]);
    expect(
      countActiveConversationFilterGroups(normalized, {
        availableChannelIds: ["a", "b"],
      }),
    ).toBe(0);
  });

  it("drops orphan ids", () => {
    const normalized = normalizeConversationFilters(
      {
        ...EMPTY_CONVERSATION_FILTERS,
        stageIds: ["keep", "gone"],
        tagIds: ["gone-tag"],
      },
      {
        availableStageIds: ["keep"],
        availableTagIds: [],
      },
    );
    expect(normalized.stageIds).toEqual(["keep"]);
    expect(normalized.tagIds).toEqual([]);
  });

  it("maps to api query", () => {
    expect(
      conversationFiltersToApiQuery({
        channelIds: ["c1"],
        unreadOnly: true,
        reply: "customer",
        conversationState: "closed",
        stageIds: ["s1"],
        tagIds: ["t1"],
        period: "older30",
      }),
    ).toEqual({
      channels: "c1",
      stages: "s1",
      tags: "t1",
      unreadOnly: true,
      replyStatus: "customer",
      conversationState: "closed",
      period: "older30",
    });
  });

  it("uniqueIds removes blanks and duplicates", () => {
    expect(uniqueIds([" a ", "a", "", "b"])).toEqual(["a", "b"]);
  });

  it("priority groups unread inbound before read inbound and outbound", () => {
    expect(
      conversationPriorityGroup({
        id: "1",
        status: "OPEN",
        unreadCount: 2,
        lastMessageDirection: "INBOUND",
      }),
    ).toBe(1);
    expect(
      conversationPriorityGroup({
        id: "2",
        status: "OPEN",
        unreadCount: 0,
        lastMessageDirection: "INBOUND",
      }),
    ).toBe(2);
    expect(
      conversationPriorityGroup({
        id: "3",
        status: "OPEN",
        lastMessageDirection: "OUTBOUND",
      }),
    ).toBe(3);
    expect(
      conversationPriorityGroup({
        id: "4",
        status: "RESOLVED",
        lastMessageDirection: "INBOUND",
      }),
    ).toBe(5);
  });

  it("sorts by priority then lastMessageAt desc stably", () => {
    const items = [
      {
        id: "out",
        status: "OPEN",
        unreadCount: 0,
        lastMessageAt: "2026-08-06T12:00:00.000Z",
        lastMessageDirection: "OUTBOUND",
      },
      {
        id: "in-read",
        status: "OPEN",
        unreadCount: 0,
        lastMessageAt: "2026-08-06T11:00:00.000Z",
        lastMessageDirection: "INBOUND",
      },
      {
        id: "in-unread",
        status: "OPEN",
        unreadCount: 1,
        lastMessageAt: "2026-08-06T10:00:00.000Z",
        lastMessageDirection: "INBOUND",
      },
      {
        id: "closed",
        status: "RESOLVED",
        unreadCount: 0,
        lastMessageAt: "2026-08-06T13:00:00.000Z",
        lastMessageDirection: "INBOUND",
      },
    ];
    const sorted = items.slice().sort(compareConversationsByPriority);
    expect(sorted.map((item) => item.id)).toEqual([
      "in-unread",
      "in-read",
      "out",
      "closed",
    ]);
  });

  it("preserves q when clearing filters", () => {
    const params = new URLSearchParams(
      "view=conversations&q=maria&channels=a&unread=1",
    );
    const next = applyConversationFiltersToSearchParams(
      params,
      EMPTY_CONVERSATION_FILTERS,
    );
    expect(next.get("q")).toBe("maria");
    expect(next.get("view")).toBe("conversations");
    expect(next.get("channels")).toBeNull();
    expect(next.get("unread")).toBeNull();
  });
});
