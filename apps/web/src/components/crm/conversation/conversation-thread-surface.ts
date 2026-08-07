/**
 * Class contracts for the conversation thread visual shell.
 * Kept as pure strings so unit tests can lock structure without DOM.
 */

export const CONVERSATION_THREAD_SHELL_CLASS =
  "conversation-thread-shell relative isolate mx-1.5 mb-1.5 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl";

export const CONVERSATION_THREAD_TEXTURE_CLASS =
  "conversation-thread-texture pointer-events-none absolute inset-0 z-0";

export const CONVERSATION_THREAD_SCROLL_CLASS =
  "conversation-thread-scroll relative z-[1] min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto p-3 sm:p-4";

export function conversationThreadSurfaceClasses() {
  return {
    shell: CONVERSATION_THREAD_SHELL_CLASS,
    texture: CONVERSATION_THREAD_TEXTURE_CLASS,
    scroll: CONVERSATION_THREAD_SCROLL_CLASS,
  };
}
