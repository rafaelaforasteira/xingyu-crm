/**
 * Conversation selection from URL. Absence of `conversation` is a valid state.
 * Never fall back to the first list item.
 */
export function resolveSelectedConversationId(
  conversationParam: string | null | undefined,
): string | null {
  if (typeof conversationParam !== "string") return null;
  const trimmed = conversationParam.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Explicit policy: do not auto-select any conversation. */
export function shouldAutoSelectFirstConversation(
  _conversationsLength?: number,
): false {
  return false;
}
