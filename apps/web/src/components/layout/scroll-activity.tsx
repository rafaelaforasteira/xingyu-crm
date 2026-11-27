"use client";

import * as React from "react";

const HIDE_AFTER_MS = 900;

/**
 * Marca com `data-scrolling` o elemento que está rolando e tira a marca pouco
 * depois que a rolagem para. O CSS em globals.css usa essa marca para mostrar
 * a barra de rolagem fina e roxa só enquanto o usuário rola.
 */
export function ScrollActivity() {
  React.useEffect(() => {
    const timers = new WeakMap<Element, number>();

    const onScroll = (event: Event) => {
      const target =
        event.target instanceof Element
          ? event.target
          : (document.scrollingElement ?? document.documentElement);
      if (!target.hasAttribute("data-scrolling")) target.setAttribute("data-scrolling", "");
      const previous = timers.get(target);
      if (previous) window.clearTimeout(previous);
      timers.set(
        target,
        window.setTimeout(() => {
          target.removeAttribute("data-scrolling");
          timers.delete(target);
        }, HIDE_AFTER_MS),
      );
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  return null;
}
