"use client";

import * as React from "react";
import {
  computeComposerTextareaSize,
  MAX_COMPOSER_TEXTAREA_HEIGHT,
  MIN_COMPOSER_TEXTAREA_HEIGHT,
} from "./conversation-composer-utils";

export function useAutoResizeTextarea(
  value: string,
  options?: {
    minHeight?: number;
    maxHeight?: number;
  },
) {
  const minHeight = options?.minHeight ?? MIN_COMPOSER_TEXTAREA_HEIGHT;
  const maxHeight = options?.maxHeight ?? MAX_COMPOSER_TEXTAREA_HEIGHT;
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.minHeight = `${minHeight}px`;
    const { height, overflowY } = computeComposerTextareaSize(
      el.scrollHeight,
      minHeight,
      maxHeight,
    );
    el.style.height = `${height}px`;
    el.style.overflowY = overflowY;
  }, [minHeight, maxHeight]);

  React.useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return { textareaRef: ref, resize };
}
