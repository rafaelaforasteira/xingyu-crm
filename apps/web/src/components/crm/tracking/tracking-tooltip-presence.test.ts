import { afterEach, describe, expect, it, vi } from "vitest";
import { createTooltipPresence } from "./tracking-tooltip-presence";

afterEach(() => vi.useRealTimers());

function setup() {
  vi.useFakeTimers();
  const show = vi.fn();
  const hide = vi.fn();
  return { show, hide, presence: createTooltipPresence({ show, hide }) };
}

describe("concept help presence", () => {
  it("keeps help visible across the pointer gap and while reading its content", () => {
    const { presence, show, hide } = setup();
    presence.enter();
    presence.leave();
    vi.advanceTimersByTime(100);
    expect(hide).not.toHaveBeenCalled();
    presence.enter(); // tooltip receives the pointer after leaving its trigger
    vi.advanceTimersByTime(1_000);
    expect(show).toHaveBeenCalled();
    expect(hide).not.toHaveBeenCalled();
    presence.leave();
    vi.advanceTimersByTime(200);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("does not close focused help when the pointer leaves", () => {
    const { presence, hide } = setup();
    presence.focus();
    presence.enter();
    presence.leave();
    vi.advanceTimersByTime(1_000);
    expect(hide).not.toHaveBeenCalled();
    presence.blur();
    vi.advanceTimersByTime(200);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("does not close hovered help on blur and dismisses after leaving both", () => {
    const { presence, hide } = setup();
    presence.focus();
    presence.enter();
    presence.blur();
    vi.advanceTimersByTime(1_000);
    expect(hide).not.toHaveBeenCalled();
    presence.leave();
    vi.advanceTimersByTime(200);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("Escape, outside click or another help can dismiss immediately without a late callback", () => {
    const { presence, hide } = setup();
    presence.enter();
    presence.leave();
    presence.dismiss();
    expect(hide).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("cancels pending dismissal on unmount and permits reuse after effect replay", () => {
    const { presence, hide } = setup();
    presence.enter();
    presence.leave();
    presence.dispose();
    vi.advanceTimersByTime(1_000);
    expect(hide).not.toHaveBeenCalled();
    presence.enter();
    presence.leave();
    vi.advanceTimersByTime(200);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("opens by click without relying on hover or trapping keyboard focus", () => {
    const { presence, show, hide } = setup();
    presence.open();
    expect(show).toHaveBeenCalledTimes(1);
    presence.dismiss();
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
