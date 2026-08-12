export const CONTEXT_SECTION_IDS = [
  "summary",
  "negotiation",
  "tracking",
  "tasks",
  "orders",
  "notes",
  "files",
  "history",
  "otherDeals",
] as const;

export type ContextSectionId = (typeof CONTEXT_SECTION_IDS)[number];
export type ContextSectionsState = Record<ContextSectionId, boolean>;

export const ALL_SECTIONS_OPEN = Object.fromEntries(
  CONTEXT_SECTION_IDS.map((id) => [id, true]),
) as ContextSectionsState;

export function mergeStoredSectionState(stored?: Partial<ContextSectionsState> | null) {
  return { ...ALL_SECTIONS_OPEN, ...(stored ?? {}) };
}

export function toggleContextSection(state: ContextSectionsState, id: ContextSectionId) {
  return { ...state, [id]: !state[id] };
}
