export type TagRef = {
  id: string;
  name: string;
  color?: string | null;
};

export type TagJunction = {
  tag?: TagRef | null;
};

export function flattenTags(
  tags: TagJunction[] | null | undefined,
): TagRef[] {
  if (!tags?.length) return [];
  const result: TagRef[] = [];
  for (const entry of tags) {
    if (!entry?.tag) continue;
    result.push({
      id: entry.tag.id,
      name: entry.tag.name,
      color: entry.tag.color ?? null,
    });
  }
  return result;
}
