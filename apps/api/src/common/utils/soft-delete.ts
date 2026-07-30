/** Soft-delete filter applied to all list/find queries where model supports deletedAt. */
export const notDeleted = { deletedAt: null } as const;

export function softDeleteData() {
  return { deletedAt: new Date() };
}
