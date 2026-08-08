import { describe, expect, it } from "vitest";
import {
  CONVERSATION_THREAD_SCROLL_CLASS,
  CONVERSATION_THREAD_SHELL_CLASS,
  CONVERSATION_THREAD_TEXTURE_CLASS,
  conversationThreadSurfaceClasses,
} from "./conversation-thread-surface";

describe("conversation thread surface classes", () => {
  it("exposes a clipping shell with discrete radius", () => {
    expect(CONVERSATION_THREAD_SHELL_CLASS).toContain("conversation-thread-shell");
    expect(CONVERSATION_THREAD_SHELL_CLASS).toContain("overflow-hidden");
    expect(CONVERSATION_THREAD_SHELL_CLASS).toContain("rounded-2xl");
    expect(CONVERSATION_THREAD_SHELL_CLASS).toContain("relative");
  });

  it("keeps texture non-interactive and behind content", () => {
    expect(CONVERSATION_THREAD_TEXTURE_CLASS).toContain("conversation-thread-texture");
    expect(CONVERSATION_THREAD_TEXTURE_CLASS).toContain("pointer-events-none");
    expect(CONVERSATION_THREAD_TEXTURE_CLASS).toContain("absolute");
    expect(CONVERSATION_THREAD_TEXTURE_CLASS).toContain("z-0");
  });

  it("keeps scroll on an inner overflow-y container", () => {
    expect(CONVERSATION_THREAD_SCROLL_CLASS).toContain("conversation-thread-scroll");
    expect(CONVERSATION_THREAD_SCROLL_CLASS).toContain("overflow-y-auto");
    expect(CONVERSATION_THREAD_SCROLL_CLASS).toContain("overflow-x-hidden");
    expect(CONVERSATION_THREAD_SCROLL_CLASS).toContain("z-[1]");
  });

  it("returns the full surface contract", () => {
    const classes = conversationThreadSurfaceClasses();
    expect(classes.shell).toBe(CONVERSATION_THREAD_SHELL_CLASS);
    expect(classes.texture).toBe(CONVERSATION_THREAD_TEXTURE_CLASS);
    expect(classes.scroll).toBe(CONVERSATION_THREAD_SCROLL_CLASS);
  });
});
